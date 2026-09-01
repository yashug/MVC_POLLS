"use server";

import bcrypt from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  drawResults, draws, entries, entryMembers, items, pattuVastralu, payments, slots,
  villaAccounts, villas,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import {
  cancelDraw, completeDraw, prepareDraw, publishDraw, recordPhysicalWinner,
} from "@/lib/draw";
import { allocateSlots, clearAllocation, reassignEntry } from "@/lib/allocate";
import { isProduction } from "@/lib/env";
import { clearAttempts } from "@/lib/throttle";
import { getActiveEvent, isEditable, setSetting } from "@/lib/items";
import { getVillaSlotEntries } from "@/lib/slots";
// The booking rules for a session are the resident ones; sharing the shape
// keeps the two forms collecting the same details.
import type { SlotDetails } from "@/app/(app)/i/[slug]/slot-actions";
import type { ItemStatus } from "@/db/schema";
import { bust } from "@/lib/cache";
import { requireAdmin } from "@/lib/session";

export type Res = { ok: true } | { ok: false; error: string };

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
};

export async function setItemStatus(itemId: number, status: ItemStatus): Promise<Res> {
  await requireAdmin();
  const before = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  await db.update(items).set({ status }).where(eq(items.id, itemId));
  await audit({
    actorType: "admin", actorId: "admin", action: "item.status_changed",
    entity: "item", entityId: itemId, before: { status: before?.status }, after: { status },
  });
  refresh();
  return { ok: true };
}

export async function setItemSchedule(
  itemId: number,
  field: "opensAt" | "closesAt" | "drawAt",
  isoLocal: string,
): Promise<Res> {
  await requireAdmin();
  // datetime-local gives IST wall-clock; store the real instant.
  const value = isoLocal ? new Date(new Date(isoLocal + ":00+05:30").getTime()) : null;
  if (isoLocal && Number.isNaN(value!.getTime())) return { ok: false, error: "That date isn't valid." };

  await db.update(items).set({ [field]: value }).where(eq(items.id, itemId));
  await audit({
    actorType: "admin", actorId: "admin", action: "item.schedule_changed",
    entity: "item", entityId: itemId, after: { [field]: value },
  });
  refresh();
  return { ok: true };
}

export async function updateSetting(key: string, value: string): Promise<Res> {
  await requireAdmin();
  const event = await getActiveEvent();
  await setSetting(event.id, key, value);
  // The visibility settings are read through the cache on every item page.
  // Waiting out the TTL is tolerable for turning a list on; it isn't for
  // turning names back off, which the committee will want to be immediate.
  bust("visibility:");
  await audit({
    actorType: "admin", actorId: "admin", action: "setting.changed",
    entity: "setting", after: { key, value },
  });
  refresh();
  return { ok: true };
}

/** For the resident who can't get in — committee clears the PIN, they set a new one. */
export async function resetVillaPin(villaNo: number): Promise<Res> {
  await requireAdmin();
  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, villaNo) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const account = await db.query.villaAccounts.findFirst({
    where: eq(villaAccounts.villaId, villa.id),
  });
  if (!account) return { ok: false, error: `Villa ${villaNo} hasn't set a PIN yet.` };

  await db.delete(villaAccounts).where(eq(villaAccounts.villaId, villa.id));
  await clearAttempts(`villa:${villa.villaNo}`);
  await audit({
    actorType: "admin", actorId: "admin", action: "villa.pin_reset",
    entity: "villa", entityId: villa.id, before: { claimedByName: account.claimedByName },
  });
  refresh();
  return { ok: true };
}

/** Set a PIN directly, for residents the committee registers on their behalf. */
/**
 * Correct the name on a villa that has already signed in, without touching its
 * PIN. Registering a resident used to accept a blank name and store "Villa 42",
 * and the only way to change it afterwards was to reset their PIN and lock them
 * out — so wherever residents are listed by name, those villas had nothing to
 * show and no way to fix it.
 */
export async function setVillaName(villaNo: number, name: string): Promise<Res> {
  await requireAdmin();
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Enter the resident's name." };

  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, villaNo) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const account = await db.query.villaAccounts.findFirst({
    where: eq(villaAccounts.villaId, villa.id),
  });
  if (!account) {
    return { ok: false, error: `Villa ${villaNo} hasn't signed in yet — register it below.` };
  }

  await db
    .update(villaAccounts)
    .set({ claimedByName: clean.slice(0, 80) })
    .where(eq(villaAccounts.villaId, villa.id));

  await audit({
    actorType: "admin", actorId: "admin", action: "villa.name_corrected",
    entity: "villa", entityId: villa.id,
    before: { claimedByName: account.claimedByName }, after: { claimedByName: clean },
  });
  refresh();
  return { ok: true };
}

export async function setVillaPin(villaNo: number, name: string, pin: string): Promise<Res> {
  await requireAdmin();
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "PIN must be exactly 4 digits." };
  // A villa registered without a name used to be stored as "Villa 42", which
  // then had nothing to show wherever residents are listed by name.
  if (!name.trim()) return { ok: false, error: "Enter the resident's name." };
  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, villaNo) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const existing = await db.query.villaAccounts.findFirst({
    where: eq(villaAccounts.villaId, villa.id),
  });
  if (existing) return { ok: false, error: `Villa ${villaNo} already has a PIN. Reset it first.` };

  await db.insert(villaAccounts).values({
    villaId: villa.id,
    pinHash: await bcrypt.hash(pin, 10),
    claimedByName: name.trim(),
    claimedAt: new Date(),
  });
  await audit({
    actorType: "admin", actorId: "admin", action: "villa.registered_by_admin",
    entity: "villa", entityId: villa.id, after: { name },
  });
  refresh();
  return { ok: true };
}

export async function prepareDrawAction(
  itemId: number,
  method: "app_wheel" | "physical",
): Promise<Res> {
  await requireAdmin();
  try {
    // Close registration first — the entrant list must be frozen before the seed.
    await db.update(items).set({ status: "closed" }).where(eq(items.id, itemId));
    await prepareDraw(itemId, method, "admin");
    refresh();
    return { ok: true };
  } catch (e) {
    await db.update(items).set({ status: "open" }).where(eq(items.id, itemId));
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't prepare the draw." };
  }
}

export async function completeDrawAction(drawId: number): Promise<Res> {
  await requireAdmin();
  await completeDraw(drawId, "admin");
  refresh();
  return { ok: true };
}

export async function publishDrawAction(drawId: number): Promise<Res> {
  await requireAdmin();
  await publishDraw(drawId, "admin");
  refresh();
  return { ok: true };
}

export async function cancelDrawAction(drawId: number, itemId: number): Promise<Res> {
  await requireAdmin();
  try {
    await cancelDraw(drawId, "admin");
    await db.update(items).set({ status: "open" }).where(eq(items.id, itemId));
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't cancel the draw." };
  }
}

export async function recordPhysicalWinnerAction(
  drawId: number,
  entryId: number,
): Promise<Res> {
  await requireAdmin();
  try {
    await recordPhysicalWinner(drawId, entryId, "admin");
    await completeDraw(drawId, "admin");
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't record the winner." };
  }
}

export async function setPaymentStatus(
  paymentId: number,
  status: "due" | "paid" | "waived",
): Promise<Res> {
  await requireAdmin();
  await db
    .update(payments)
    .set({ status, markedBy: "admin", markedAt: new Date() })
    .where(eq(payments.id, paymentId));
  await audit({
    actorType: "admin", actorId: "admin", action: "payment.status_changed",
    entity: "payment", entityId: paymentId, after: { status },
  });
  refresh();
  return { ok: true };
}

/**
 * Arm the draw. Every watching phone counts down to this instant and starts
 * turning together. The lead time gives residents a moment to look up.
 */
export async function goLiveAction(drawId: number, leadSeconds = 12): Promise<Res> {
  await requireAdmin();
  const draw = await db.query.draws.findFirst({ where: eq(draws.id, drawId) });
  if (!draw) return { ok: false, error: "That draw no longer exists." };
  if (draw.spinStartsAt) return { ok: false, error: "This draw is already live." };

  const startsAt = new Date(Date.now() + leadSeconds * 1000);
  await db.update(draws).set({ spinStartsAt: startsAt }).where(eq(draws.id, drawId));
  await audit({
    actorType: "admin", actorId: "admin", action: "draw.went_live",
    entity: "draw", entityId: drawId, after: { startsAt },
  });
  refresh();
  return { ok: true };
}

/* ── Slot-based items: pooja and annadanam ─────────────────── */

export async function updateSlotConfig(
  slotId: number,
  patch: { capacity?: number; adultsCount?: number; kidsCount?: number },
): Promise<Res> {
  await requireAdmin();
  const set: Record<string, number> = {};
  if (patch.capacity != null) set.capacity = Math.max(0, patch.capacity);
  if (patch.adultsCount != null) set.adultsCount = Math.max(0, patch.adultsCount);
  if (patch.kidsCount != null) set.kidsCount = Math.max(0, patch.kidsCount);
  if (Object.keys(set).length === 0) return { ok: true };

  await db.update(slots).set(set).where(eq(slots.id, slotId));
  await audit({
    actorType: "admin", actorId: "admin", action: "slot.config_changed",
    entity: "slot", entityId: slotId, after: set,
  });
  refresh();
  return { ok: true };
}

export async function allocateSlotsAction(itemId: number): Promise<Res> {
  await requireAdmin();
  try {
    await allocateSlots(itemId, "admin");
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't allocate." };
  }
}

export async function clearAllocationAction(itemId: number): Promise<Res> {
  await requireAdmin();
  await clearAllocation(itemId, "admin");
  refresh();
  return { ok: true };
}

export async function reassignEntryAction(
  entryId: number,
  slotId: number | null,
): Promise<Res> {
  await requireAdmin();
  try {
    await reassignEntry(entryId, slotId, "admin");
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't move that entry." };
  }
}

/**
 * Wipe everything residents have done, keeping villas, items and sessions.
 * Preview and local only — this must never be reachable on the real thing.
 */
export async function resetTestDataAction(): Promise<Res> {
  await requireAdmin();
  if (isProduction) {
    return { ok: false, error: "Resetting data isn't available on the live site." };
  }

  // Children first — foreign keys point upward.
  await db.delete(pattuVastralu);
  await db.delete(drawResults);
  await db.delete(draws);
  await db.delete(payments);
  await db.delete(entryMembers);
  await db.delete(entries);
  await db.delete(villaAccounts);

  await db.update(items).set({ status: "open" });

  await audit({
    actorType: "admin", actorId: "admin", action: "preview.data_reset",
    entity: "event",
  });
  refresh();
  return { ok: true };
}

/** Set the same number of places on every unlocked session of an item. */
export async function setAllSlotCapacities(
  itemId: number,
  capacity: number,
): Promise<Res> {
  await requireAdmin();
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 999) {
    return { ok: false, error: "Enter a number of places between 0 and 999." };
  }

  await db
    .update(slots)
    .set({ capacity })
    .where(and(eq(slots.itemId, itemId), eq(slots.isLocked, false)));

  await audit({
    actorType: "admin", actorId: "admin", action: "slots.capacity_set_for_all",
    entity: "item", entityId: itemId, after: { capacity },
  });
  refresh();
  return { ok: true };
}

/* ── Entering on a resident's behalf ───────────────────────── */

/**
 * Put a villa into a draw for them. Older residents ring a committee member or
 * stop them at the gate rather than working through the app, and this writes
 * that conversation down: the villa needs no account and never has to sign in.
 * Nothing else about the entry is special — it goes into the bowl like any
 * other, and if the resident does sign in later it is theirs to withdraw.
 */
export async function enterVillaAction(
  itemId: number,
  villaNosRaw: string,
  familyName = "",
): Promise<Res> {
  await requireAdmin();

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return { ok: false, error: "That item no longer exists." };
  if (item.collectsSlot)
    return { ok: false, error: "This one needs a session picked with it." };
  if (!isEditable(item))
    return { ok: false, error: "Registration is closed for this one — reopen it first." };

  // "42", "42, 43" and "42 43" all mean the same thing to someone typing fast.
  const nos = [...new Set(villaNosRaw.split(/[^0-9]+/).filter(Boolean).map(Number))];
  if (nos.length === 0) return { ok: false, error: "Enter a villa number." };
  if (nos.length > item.maxGroupSize)
    return {
      ok: false,
      error:
        item.maxGroupSize === 1
          ? "This one is one villa per entry."
          : `This one takes at most ${item.maxGroupSize} villas per entry.`,
    };

  const rows = await db.query.villas.findMany({ where: inArray(villas.villaNo, nos) });
  const villaOf = new Map(rows.map((v) => [v.villaNo, v]));
  const unknown = nos.filter((n) => !villaOf.has(n));
  if (unknown.length > 0)
    return {
      ok: false,
      error: `${unknown.length === 1 ? "Villa" : "Villas"} ${unknown.join(", ")} ${
        unknown.length === 1 ? "isn't" : "aren't"
      } on the list.`,
    };

  const ids = nos.map((n) => villaOf.get(n)!.id);
  const taken = await db.query.entryMembers.findMany({
    where: and(eq(entryMembers.itemId, item.id), inArray(entryMembers.villaId, ids)),
  });
  if (taken.length > 0) {
    const clashing = nos.filter((n) => taken.some((t) => t.villaId === villaOf.get(n)!.id));
    return {
      ok: false,
      error: `${clashing.length === 1 ? "Villa" : "Villas"} ${clashing.join(", ")} ${
        clashing.length === 1 ? "has" : "have"
      } already entered this one.`,
    };
  }

  const name = familyName.trim().slice(0, 80);
  const now = new Date();
  const [entry] = await db
    .insert(entries)
    .values({
      eventId: item.eventId,
      itemId: item.id,
      leadVillaId: ids[0],
      familyName: name || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Every villa counts straight away. An invitation would sit unanswered
  // forever — the reason this entry exists is that nobody here is signing in.
  await db.insert(entryMembers).values(
    ids.map((villaId, i) => ({
      entryId: entry.id,
      itemId: item.id,
      slotKey: 0,
      villaId,
      role: (i === 0 ? "lead" : "member") as "lead" | "member",
      acceptance: "accepted" as const,
      respondedAt: now,
    })),
  );

  // Same ₹50 token as any other entry, still collected offline.
  if (item.entryFee > 0) {
    await db.insert(payments).values({
      entryId: entry.id,
      villaId: ids[0],
      amount: item.entryFee,
      status: "due",
    });
  }

  await audit({
    actorType: "admin", actorId: "admin", action: "entry.created_for_villa",
    entity: "entry", entityId: entry.id,
    after: { itemId: item.id, villaNos: nos, familyName: name || null },
  });
  refresh();
  return { ok: true };
}

/**
 * The same thing for the items that ask for a session — pooja and annadanam.
 * It follows the resident booking rules exactly, including moving an existing
 * booking rather than refusing it on the items capped at one session per villa,
 * so `moved` says which of the two happened and the committee can tell the
 * resident what they now have.
 */
export type BookForVillaRes = { ok: true; moved: boolean } | { ok: false; error: string };

export async function bookSlotForVillaAction(
  itemId: number,
  slotId: number,
  villaNoRaw: string,
  details: SlotDetails = {},
): Promise<BookForVillaRes> {
  await requireAdmin();

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return { ok: false, error: "That item no longer exists." };
  if (!item.collectsSlot)
    return { ok: false, error: "This one has no sessions — enter the villa without one." };
  if (!isEditable(item))
    return { ok: false, error: "Registration is closed for this one — reopen it first." };

  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.itemId, itemId)),
  });
  if (!slot) return { ok: false, error: "Pick a session." };
  // Reserved sessions are filled from the allocation page, not booked into.
  if (slot.isLocked) return { ok: false, error: "That session is reserved." };

  const raw = villaNoRaw.trim();
  const no = Number(raw);
  // An empty box is Number("") === 0, which would otherwise be reported as the
  // villa number 0 not existing.
  if (!raw || !Number.isInteger(no) || no < 1) return { ok: false, error: "Enter a villa number." };
  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, no) });
  if (!villa) return { ok: false, error: `Villa ${no} isn't on the list.` };

  const mine = await getVillaSlotEntries(itemId, villa.id);
  const single = item.maxEntriesPerVilla === 1;

  if (mine.some((e) => e.requestedSlotId === slotId))
    return { ok: false, error: `Villa ${no} already has this session.` };
  if (!single && item.maxEntriesPerVilla != null && mine.length >= item.maxEntriesPerVilla)
    return {
      ok: false,
      error: `Villa ${no} can take at most ${item.maxEntriesPerVilla} of these.`,
    };

  const clean = (v: string | undefined) => {
    const t = (v ?? "").trim();
    return t.length ? t.slice(0, 80) : null;
  };
  const now = new Date();
  const patch = {
    familyName: clean(details.familyName),
    gotram: clean(details.gotram),
    attendeesCount: details.attendeesCount ?? null,
    amountPledged: details.amountPledged ?? null,
    isPartial: details.isPartial ?? false,
  };

  // Pooja takes one session per villa, so a second choice is a change of mind
  // rather than a second booking — exactly as it behaves for a resident.
  if (single && mine.length > 0) {
    const existing = mine[0];
    // A blank box here means "leave it alone", not "clear it". The resident form
    // arrives pre-filled with their own details on a move; this one can't, and
    // moving a villa to another session shouldn't quietly lose the gotram they
    // gave when they booked.
    const merged = {
      familyName: patch.familyName ?? existing.familyName,
      gotram: patch.gotram ?? existing.gotram,
      attendeesCount: patch.attendeesCount ?? existing.attendeesCount,
      amountPledged: patch.amountPledged ?? existing.amountPledged,
      isPartial: patch.amountPledged != null ? patch.isPartial : existing.isPartial,
    };
    await db
      .update(entries)
      .set({ requestedSlotId: slotId, ...merged, updatedAt: now })
      .where(eq(entries.id, existing.id));
    // slotKey backs the one-entry-per-villa-per-session index, so it moves too.
    await db
      .update(entryMembers)
      .set({ slotKey: slotId })
      .where(eq(entryMembers.entryId, existing.id));

    await audit({
      actorType: "admin", actorId: "admin", action: "slot.moved_for_villa",
      entity: "entry", entityId: existing.id,
      before: { slotId: existing.requestedSlotId }, after: { villaNo: no, slotId, ...merged },
    });
    refresh();
    return { ok: true, moved: true };
  }

  const [entry] = await db
    .insert(entries)
    .values({
      eventId: item.eventId,
      itemId: item.id,
      leadVillaId: villa.id,
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
    villaId: villa.id,
    role: "lead",
    acceptance: "accepted",
    respondedAt: now,
  });

  await audit({
    actorType: "admin", actorId: "admin", action: "slot.booked_for_villa",
    entity: "entry", entityId: entry.id, after: { villaNo: no, slotId, ...patch },
  });
  refresh();
  return { ok: true, moved: false };
}

/**
 * Take an entry back out. A villa entered on someone's behalf can't undo a
 * mistyped number itself — it has no login — so the committee that made the
 * entry has to be able to unmake it.
 */
export async function withdrawEntryAsAdmin(entryId: number): Promise<Res> {
  await requireAdmin();

  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry || entry.status !== "active") return { ok: false, error: "That entry is already gone." };

  const item = await db.query.items.findFirst({ where: eq(items.id, entry.itemId) });
  if (!item) return { ok: false, error: "That item no longer exists." };
  // Once the entrant list is frozen for a draw, removing an entry would leave
  // the published checksum describing a list that no longer exists.
  if (!isEditable(item))
    return { ok: false, error: "Registration is closed for this one — reopen it first." };

  const members = await db.query.entryMembers.findMany({
    where: eq(entryMembers.entryId, entryId),
  });
  const villaRows = members.length
    ? await db.query.villas.findMany({ where: inArray(villas.id, members.map((m) => m.villaId)) })
    : [];

  await db.update(entries).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(entries.id, entryId));
  // Frees every member to enter again — the unique index would otherwise hold them.
  await db.delete(entryMembers).where(eq(entryMembers.entryId, entryId));

  await audit({
    actorType: "admin", actorId: "admin", action: "entry.withdrawn_by_admin",
    entity: "entry", entityId: entryId,
    before: { itemId: item.id, villaNos: villaRows.map((v) => v.villaNo).sort((a, b) => a - b) },
  });
  refresh();
  return { ok: true };
}
