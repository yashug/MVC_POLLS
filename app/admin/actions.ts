"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
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
import { getActiveEvent, setSetting } from "@/lib/items";
import type { ItemStatus } from "@/db/schema";
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
  await audit({
    actorType: "admin", actorId: "admin", action: "villa.pin_reset",
    entity: "villa", entityId: villa.id, before: { claimedByName: account.claimedByName },
  });
  refresh();
  return { ok: true };
}

/** Set a PIN directly, for residents the committee registers on their behalf. */
export async function setVillaPin(villaNo: number, name: string, pin: string): Promise<Res> {
  await requireAdmin();
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "PIN must be exactly 4 digits." };
  const villa = await db.query.villas.findFirst({ where: eq(villas.villaNo, villaNo) });
  if (!villa) return { ok: false, error: "That villa number isn't on the list." };

  const existing = await db.query.villaAccounts.findFirst({
    where: eq(villaAccounts.villaId, villa.id),
  });
  if (existing) return { ok: false, error: `Villa ${villaNo} already has a PIN. Reset it first.` };

  await db.insert(villaAccounts).values({
    villaId: villa.id,
    pinHash: await bcrypt.hash(pin, 10),
    claimedByName: name || `Villa ${villaNo}`,
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
