import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { entries, entryMembers, items, settings, villas } from "@/db/schema";

export type Item = typeof items.$inferSelect;

export type ItemState = "not_open" | "open" | "closed" | "drawn" | "published";

/** Status and clock together decide what a resident can actually do. */
export function itemState(item: Item, now = new Date()): ItemState {
  if (item.status === "drawn") return "drawn";
  if (item.status === "published") return "published";
  if (item.status === "draft") return "not_open";
  if (item.opensAt && now < item.opensAt) return "not_open";
  if (item.closesAt && now > item.closesAt) return "closed";
  return item.status === "closed" ? "closed" : "open";
}

export const isEditable = (item: Item, now = new Date()) => itemState(item, now) === "open";

export async function getActiveEvent() {
  const ev = await db.query.events.findFirst({ where: (e, { eq }) => eq(e.isActive, true) });
  if (!ev) throw new Error("No active event. Run `npm run db:seed`.");
  return ev;
}

export async function getItems(eventId: number) {
  return db.query.items.findMany({
    where: eq(items.eventId, eventId),
    orderBy: (i, { asc }) => [asc(i.sortOrder)],
  });
}

export async function getItemBySlug(eventId: number, slug: string) {
  return db.query.items.findFirst({
    where: and(eq(items.eventId, eventId), eq(items.slug, slug)),
  });
}

/** Active entries for an item, with every member villa attached. */
export async function getEntriesWithMembers(itemId: number) {
  const rows = await db.query.entries.findMany({
    where: and(eq(entries.itemId, itemId), eq(entries.status, "active")),
    orderBy: (e, { asc }) => [asc(e.id)],
  });
  if (rows.length === 0) return [];

  const members = await db.query.entryMembers.findMany({
    where: inArray(
      entryMembers.entryId,
      rows.map((r) => r.id),
    ),
  });
  const villaRows = await db.query.villas.findMany({
    where: inArray(
      villas.id,
      members.map((m) => m.villaId),
    ),
  });
  const villaNo = new Map(villaRows.map((v) => [v.id, v.villaNo]));

  return rows.map((entry) => ({
    ...entry,
    members: members
      .filter((m) => m.entryId === entry.id)
      .map((m) => ({ ...m, villaNo: villaNo.get(m.villaId)! }))
      .sort((a, b) => (a.role === "lead" ? -1 : b.role === "lead" ? 1 : a.villaNo - b.villaNo)),
  }));
}

/** A group is one ticket however many villas are in it — so this is the ticket count. */
export async function countEntries(itemId: number) {
  const [row] = await db
    .select({ n: count() })
    .from(entries)
    .where(and(eq(entries.itemId, itemId), eq(entries.status, "active")));
  return row?.n ?? 0;
}

/**
 * Whether this villa is in an entry at all. The home page shows five of these
 * and only needs the tick — `getVillaEntry` would pull every entry, member and
 * villa for each item to answer the same yes/no.
 */
export async function hasEntry(itemId: number, villaId: number) {
  const membership = await db.query.entryMembers.findFirst({
    where: and(eq(entryMembers.itemId, itemId), eq(entryMembers.villaId, villaId)),
    columns: { entryId: true },
  });
  return membership != null;
}

/** The entry this villa belongs to, whether they created it or were added to it. */
export async function getVillaEntry(itemId: number, villaId: number) {
  const membership = await db.query.entryMembers.findFirst({
    where: and(eq(entryMembers.itemId, itemId), eq(entryMembers.villaId, villaId)),
  });
  if (!membership) return null;

  const all = await getEntriesWithMembers(itemId);
  return all.find((e) => e.id === membership.entryId) ?? null;
}

export async function getSetting(eventId: number, key: string) {
  const row = await db.query.settings.findFirst({
    where: and(eq(settings.eventId, eventId), eq(settings.key, key)),
  });
  return row?.value ?? null;
}

export async function setSetting(eventId: number, key: string, value: string) {
  const existing = await db.query.settings.findFirst({
    where: and(eq(settings.eventId, eventId), eq(settings.key, key)),
  });
  if (existing) {
    await db.update(settings).set({ value }).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({ eventId, key, value });
  }
}

export type PendingInvite = {
  entryId: number;
  itemSlug: string;
  itemTitleEn: string;
  itemTitleTe: string;
  leadVillaNo: number;
};

/**
 * Group invitations still waiting on this villa. Items that ask for acceptance
 * would otherwise leave people unaware they'd been added at all.
 */
export async function getPendingInvites(villaId: number): Promise<PendingInvite[]> {
  const pending = await db.query.entryMembers.findMany({
    where: and(eq(entryMembers.villaId, villaId), eq(entryMembers.acceptance, "pending")),
  });
  if (pending.length === 0) return [];

  const entryRows = await db.query.entries.findMany({
    where: inArray(entries.id, pending.map((p) => p.entryId)),
  });
  const active = entryRows.filter((e) => e.status === "active");
  if (active.length === 0) return [];

  const itemRows = await db.query.items.findMany({
    where: inArray(items.id, active.map((e) => e.itemId)),
  });
  const leadRows = await db.query.villas.findMany({
    where: inArray(villas.id, active.map((e) => e.leadVillaId)),
  });

  const itemOf = new Map(itemRows.map((i) => [i.id, i]));
  const leadOf = new Map(leadRows.map((v) => [v.id, v.villaNo]));

  return active.flatMap((e) => {
    const item = itemOf.get(e.itemId);
    if (!item || itemState(item) !== "open") return [];
    return [{
      entryId: e.id,
      itemSlug: item.slug,
      itemTitleEn: item.titleEn,
      itemTitleTe: item.titleTe,
      leadVillaNo: leadOf.get(e.leadVillaId) ?? 0,
    }];
  });
}
