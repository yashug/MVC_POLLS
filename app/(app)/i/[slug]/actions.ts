"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { entries, entryMembers, items, payments, villas } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getVillaEntry, isEditable } from "@/lib/items";
import { requireVilla } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function loadItem(itemId: number) {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) throw new Error("Item not found");
  return item;
}

function refresh(slug: string) {
  revalidatePath(`/i/${slug}`);
  revalidatePath("/");
}

/** Create a solo entry. Group members get added afterwards. */
export async function enterDraw(itemId: number): Promise<ActionResult> {
  const { villaId, villaNo } = await requireVilla();
  const item = await loadItem(itemId);
  if (!isEditable(item)) return { ok: false, error: "Registration is closed for this item." };

  const existing = await getVillaEntry(item.id, villaId);
  if (existing) return { ok: false, error: "Villa " + villaNo + " is already in this one." };

  const now = new Date();
  const [entry] = await db
    .insert(entries)
    .values({
      eventId: item.eventId,
      itemId: item.id,
      leadVillaId: villaId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(entryMembers).values({
    entryId: entry.id,
    itemId: item.id,
    slotKey: 0,
    villaId,
    role: "lead",
    acceptance: "accepted",
    respondedAt: now,
  });

  // ₹50 token for the 2 kg laddu draw — collected offline, verified by the committee.
  if (item.entryFee > 0) {
    await db.insert(payments).values({
      entryId: entry.id,
      villaId,
      amount: item.entryFee,
      status: "due",
    });
  }

  await audit({
    actorType: "villa", actorId: villaNo, action: "entry.created",
    entity: "entry", entityId: entry.id, after: { itemId: item.id },
  });

  refresh(item.slug);
  return { ok: true };
}

export async function addMember(entryId: number, villaNoRaw: string): Promise<ActionResult> {
  const { villaId, villaNo } = await requireVilla();

  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry || entry.status !== "active") return { ok: false, error: "That entry no longer exists." };
  const item = await loadItem(entry.itemId);
  if (!isEditable(item)) return { ok: false, error: "Registration is closed for this item." };
  if (entry.leadVillaId !== villaId)
    return { ok: false, error: "Only the villa that created the group can add members." };

  const target = Number(villaNoRaw);
  if (!Number.isInteger(target) || target < 1 || target > 247)
    return { ok: false, error: "Enter a villa number between 1 and 247." };
  if (target === villaNo) return { ok: false, error: "Villa " + villaNo + " is already in the group." };

  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, target) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const current = await db.query.entryMembers.findMany({ where: eq(entryMembers.entryId, entryId) });
  if (current.length >= item.maxGroupSize)
    return {
      ok: false,
      error: `This group is full — ${item.maxGroupSize} villas is the maximum.`,
    };

  const clash = await db.query.entryMembers.findFirst({
    where: and(eq(entryMembers.itemId, item.id), eq(entryMembers.villaId, villa.id)),
  });
  if (clash) return { ok: false, error: `Villa ${target} has already entered this one.` };

  const now = new Date();
  await db.insert(entryMembers).values({
    entryId,
    itemId: item.id,
    slotKey: 0,
    villaId: villa.id,
    role: "member",
    // Idol draw runs on a two-day clock, so members are added directly and can
    // leave if they'd rather not be in. Slower items ask for acceptance first.
    acceptance: item.requiresAcceptance ? "pending" : "accepted",
    respondedAt: item.requiresAcceptance ? null : now,
  });
  await db.update(entries).set({ updatedAt: now }).where(eq(entries.id, entryId));

  await audit({
    actorType: "villa", actorId: villaNo, action: "entry.member_added",
    entity: "entry", entityId: entryId, after: { villaNo: target },
  });

  refresh(item.slug);
  return { ok: true };
}

export async function removeMember(entryId: number, targetVillaId: number): Promise<ActionResult> {
  const { villaId, villaNo } = await requireVilla();

  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry || entry.status !== "active") return { ok: false, error: "That entry no longer exists." };
  const item = await loadItem(entry.itemId);
  if (!isEditable(item)) return { ok: false, error: "Registration is closed for this item." };

  // The lead can remove anyone; anyone else can remove only themselves.
  const isLead = entry.leadVillaId === villaId;
  if (!isLead && targetVillaId !== villaId)
    return { ok: false, error: "You can only remove your own villa from this group." };
  if (targetVillaId === entry.leadVillaId)
    return { ok: false, error: "The villa that created the group can't be removed. Withdraw the entry instead." };

  await db
    .delete(entryMembers)
    .where(and(eq(entryMembers.entryId, entryId), eq(entryMembers.villaId, targetVillaId)));
  await db.update(entries).set({ updatedAt: new Date() }).where(eq(entries.id, entryId));

  await audit({
    actorType: "villa", actorId: villaNo, action: "entry.member_removed",
    entity: "entry", entityId: entryId, before: { villaId: targetVillaId },
  });

  refresh(item.slug);
  return { ok: true };
}

/** A member accepting or declining an invitation (items that ask for it). */
export async function respondToInvite(
  entryId: number,
  accept: boolean,
): Promise<ActionResult> {
  const { villaId, villaNo } = await requireVilla();
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry || entry.status !== "active") return { ok: false, error: "That entry no longer exists." };
  const item = await loadItem(entry.itemId);
  if (!isEditable(item)) return { ok: false, error: "Registration is closed for this item." };

  if (accept) {
    await db
      .update(entryMembers)
      .set({ acceptance: "accepted", respondedAt: new Date() })
      .where(and(eq(entryMembers.entryId, entryId), eq(entryMembers.villaId, villaId)));
  } else {
    await db
      .delete(entryMembers)
      .where(and(eq(entryMembers.entryId, entryId), eq(entryMembers.villaId, villaId)));
  }

  await audit({
    actorType: "villa", actorId: villaNo,
    action: accept ? "entry.invite_accepted" : "entry.invite_declined",
    entity: "entry", entityId: entryId,
  });

  refresh(item.slug);
  return { ok: true };
}

/** Withdraw the whole entry. Only the lead villa can do this. */
export async function withdrawEntry(entryId: number): Promise<ActionResult> {
  const { villaId, villaNo } = await requireVilla();

  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry || entry.status !== "active") return { ok: false, error: "That entry no longer exists." };
  const item = await loadItem(entry.itemId);
  if (!isEditable(item)) return { ok: false, error: "Registration is closed for this item." };
  if (entry.leadVillaId !== villaId)
    return { ok: false, error: "Only the villa that created the entry can withdraw it." };

  await db.update(entries).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(entries.id, entryId));
  // Free every member to enter again — the unique index would otherwise hold them.
  await db.delete(entryMembers).where(eq(entryMembers.entryId, entryId));

  await audit({
    actorType: "villa", actorId: villaNo, action: "entry.withdrawn",
    entity: "entry", entityId: entryId,
  });

  refresh(item.slug);
  return { ok: true };
}
