import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { entries, entryMembers, slots, villas } from "@/db/schema";

export type Slot = typeof slots.$inferSelect;

/** Fixed pooja times from the 19 Aug committee meeting. Meals are not fixed. */
export const PERIOD_TIME: Record<string, string> = {
  morning: "9:00 AM",
  evening: "6:00 PM",
};

export const PERIOD_LABEL: Record<string, { en: string; te: string }> = {
  morning: { en: "Morning", te: "ఉదయం" },
  evening: { en: "Evening", te: "సాయంత్రం" },
  breakfast: { en: "Breakfast", te: "అల్పాహారం" },
  lunch: { en: "Lunch", te: "మధ్యాహ్న భోజనం" },
  dinner: { en: "Dinner", te: "రాత్రి భోజనం" },
};

export async function getSlots(itemId: number) {
  return db.query.slots.findMany({
    where: eq(slots.itemId, itemId),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  });
}

export type SlotEntry = {
  id: number;
  villaNos: number[];
  leadVillaId: number;
  requestedSlotId: number | null;
  assignedSlotId: number | null;
  amountPledged: number | null;
  isPartial: boolean;
  familyName: string | null;
  gotram: string | null;
  attendeesCount: number | null;
};

/** Every active entry for a slot-based item, with member villa numbers attached. */
export async function getSlotEntries(itemId: number): Promise<SlotEntry[]> {
  const rows = await db.query.entries.findMany({
    where: and(eq(entries.itemId, itemId), eq(entries.status, "active")),
    orderBy: (e, { asc }) => [asc(e.id)],
  });
  if (rows.length === 0) return [];

  const members = await db.query.entryMembers.findMany({
    where: inArray(entryMembers.entryId, rows.map((r) => r.id)),
  });
  const villaRows = await db.query.villas.findMany({
    where: inArray(villas.id, members.map((m) => m.villaId)),
  });
  const noOf = new Map(villaRows.map((v) => [v.id, v.villaNo]));

  return rows.map((e) => ({
    id: e.id,
    villaNos: members
      .filter((m) => m.entryId === e.id)
      .map((m) => noOf.get(m.villaId)!)
      .sort((a, b) => a - b),
    leadVillaId: e.leadVillaId,
    requestedSlotId: e.requestedSlotId,
    assignedSlotId: e.assignedSlotId,
    amountPledged: e.amountPledged,
    isPartial: e.isPartial,
    familyName: e.familyName,
    gotram: e.gotram,
    attendeesCount: e.attendeesCount,
  }));
}

/** How many villas have asked for each slot — shown to residents so they spread out. */
export function requestCounts(entries: SlotEntry[]) {
  const map = new Map<number, number>();
  for (const e of entries) {
    if (e.requestedSlotId == null) continue;
    map.set(e.requestedSlotId, (map.get(e.requestedSlotId) ?? 0) + 1);
  }
  return map;
}

export function allocatedCounts(entries: SlotEntry[]) {
  const map = new Map<number, number>();
  for (const e of entries) {
    if (e.assignedSlotId == null) continue;
    map.set(e.assignedSlotId, (map.get(e.assignedSlotId) ?? 0) + 1);
  }
  return map;
}

/** Everything this villa has booked for a slot-based item. */
export async function getVillaSlotEntries(itemId: number, villaId: number) {
  const memberships = await db.query.entryMembers.findMany({
    where: and(eq(entryMembers.itemId, itemId), eq(entryMembers.villaId, villaId)),
  });
  if (memberships.length === 0) return [];
  const all = await getSlotEntries(itemId);
  const mine = new Set(memberships.map((m) => m.entryId));
  return all.filter((e) => mine.has(e.id));
}

export const slotLabel = (s: Slot, lang: "en" | "te") => {
  const d = new Date(s.date + "T12:00:00Z");
  const date = new Intl.DateTimeFormat(lang === "te" ? "te-IN" : "en-IN", {
    timeZone: "UTC", day: "numeric", month: "short",
  }).format(d);
  const period = PERIOD_LABEL[s.period]?.[lang] ?? s.period;
  const time = PERIOD_TIME[s.period];
  return time ? `${date} · ${period}, ${time}` : `${date} · ${period}`;
};
