"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { entries, entryMembers, items, slots } from "@/db/schema";
import { audit } from "@/lib/audit";
import { isEditable } from "@/lib/items";
import { getVillaSlotEntries } from "@/lib/slots";
import { requireVilla } from "@/lib/session";

export type Res = { ok: true } | { ok: false; error: string };

export type SlotDetails = {
  familyName?: string;
  gotram?: string;
  attendeesCount?: number | null;
  amountPledged?: number | null;
  isPartial?: boolean;
};

const clean = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return s.length ? s.slice(0, 80) : null;
};

/**
 * Book a session. Items capped at one entry per villa (pooja) move the existing
 * booking rather than refusing it — changing your mind shouldn't mean withdrawing
 * first. Items with no cap (annadanam) add another entry.
 */
export async function bookSlot(
  itemId: number,
  slotId: number,
  details: SlotDetails = {},
): Promise<Res> {
  const { villaId, villaNo } = await requireVilla();

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return { ok: false, error: "That item no longer exists." };
  if (!isEditable(item)) return { ok: false, error: "Registration is closed for this one." };

  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.itemId, itemId)),
  });
  if (!slot) return { ok: false, error: "That session isn't on the list." };
  if (slot.isLocked) return { ok: false, error: "That session is reserved." };

  const mine = await getVillaSlotEntries(itemId, villaId);
  const single = item.maxEntriesPerVilla === 1;

  if (mine.some((e) => e.requestedSlotId === slotId)) {
    return { ok: false, error: "You've already asked for this session." };
  }
  if (!single && item.maxEntriesPerVilla != null && mine.length >= item.maxEntriesPerVilla) {
    return { ok: false, error: `You can take part in at most ${item.maxEntriesPerVilla}.` };
  }

  const now = new Date();
  const patch = {
    familyName: clean(details.familyName),
    gotram: clean(details.gotram),
    attendeesCount: details.attendeesCount ?? null,
    amountPledged: details.amountPledged ?? null,
    isPartial: details.isPartial ?? false,
  };

  if (single && mine.length > 0) {
    const existing = mine[0];
    await db
      .update(entries)
      .set({ requestedSlotId: slotId, ...patch, updatedAt: now })
      .where(eq(entries.id, existing.id));
    // slotKey backs the one-entry-per-villa-per-session index, so it moves too.
    await db
      .update(entryMembers)
      .set({ slotKey: slotId })
      .where(eq(entryMembers.entryId, existing.id));

    await audit({
      actorType: "villa", actorId: villaNo, action: "slot.moved",
      entity: "entry", entityId: existing.id,
      before: { slotId: existing.requestedSlotId }, after: { slotId },
    });
    revalidatePath(`/i/${item.slug}`);
    revalidatePath("/");
    return { ok: true };
  }

  const [entry] = await db
    .insert(entries)
    .values({
      eventId: item.eventId,
      itemId: item.id,
      leadVillaId: villaId,
      requestedSlotId: slotId,
      ...patch,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(entryMembers).values({
    entryId: entry.id,
    itemId: item.id,
    slotKey: slotId,
    villaId,
    role: "lead",
    acceptance: "accepted",
    respondedAt: now,
  });

  await audit({
    actorType: "villa", actorId: villaNo, action: "slot.booked",
    entity: "entry", entityId: entry.id, after: { slotId, ...patch },
  });
  revalidatePath(`/i/${item.slug}`);
  revalidatePath("/");
  return { ok: true };
}

export async function updateSlotDetails(entryId: number, details: SlotDetails): Promise<Res> {
  const { villaId, villaNo } = await requireVilla();

  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry || entry.status !== "active") return { ok: false, error: "That booking no longer exists." };
  const item = await db.query.items.findFirst({ where: eq(items.id, entry.itemId) });
  if (!item || !isEditable(item)) return { ok: false, error: "Registration is closed for this one." };

  const member = await db.query.entryMembers.findFirst({
    where: and(eq(entryMembers.entryId, entryId), eq(entryMembers.villaId, villaId)),
  });
  if (!member) return { ok: false, error: "That isn't your booking." };

  await db
    .update(entries)
    .set({
      familyName: clean(details.familyName),
      gotram: clean(details.gotram),
      attendeesCount: details.attendeesCount ?? null,
      amountPledged: details.amountPledged ?? null,
      isPartial: details.isPartial ?? false,
      updatedAt: new Date(),
    })
    .where(eq(entries.id, entryId));

  await audit({
    actorType: "villa", actorId: villaNo, action: "slot.details_updated",
    entity: "entry", entityId: entryId, after: details,
  });
  revalidatePath(`/i/${item.slug}`);
  return { ok: true };
}

export async function withdrawSlotEntry(entryId: number): Promise<Res> {
  const { villaId, villaNo } = await requireVilla();

  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry || entry.status !== "active") return { ok: false, error: "That booking no longer exists." };
  const item = await db.query.items.findFirst({ where: eq(items.id, entry.itemId) });
  if (!item || !isEditable(item)) return { ok: false, error: "Registration is closed for this one." };
  if (entry.leadVillaId !== villaId)
    return { ok: false, error: "Only the villa that made the booking can withdraw it." };

  await db.update(entries).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(entries.id, entryId));
  await db.delete(entryMembers).where(eq(entryMembers.entryId, entryId));

  await audit({
    actorType: "villa", actorId: villaNo, action: "slot.withdrawn",
    entity: "entry", entityId: entryId,
  });
  revalidatePath(`/i/${item.slug}`);
  revalidatePath("/");
  return { ok: true };
}
