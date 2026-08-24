import { and, count, eq, inArray } from "drizzle-orm";
import { cached } from "@/lib/cache";
import { db } from "@/db";
import { entries, entryMembers, items, settings, villaAccounts, villas } from "@/db/schema";

import type { Acceptance } from "@/db/schema";

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

/**
 * The resident-facing reads. Same rows as above, held briefly so they are not
 * two Tokyo round trips at the front of every page.
 *
 * The committee deliberately does NOT use these: someone editing a date on the
 * dashboard must see the change land, not their own edit a few seconds out of
 * date. Admin pages and every server action keep reading straight through.
 *
 * Item rows carry opensAt and closesAt, and `itemState` compares them against
 * the clock at render time — so a cached row still opens and closes on time.
 * Only a committee member changing a status by hand can be briefly behind, and
 * an entry submitted in that window is still refused by the action, which
 * re-reads the item itself.
 */
export const getActiveEventCached = () => cached("event", 60_000, getActiveEvent);

export const getItemsCached = (eventId: number) =>
  cached(`items:${eventId}`, 20_000, () => getItems(eventId));

export const getItemBySlugCached = (eventId: number, slug: string) =>
  cached(`item:${eventId}:${slug}`, 20_000, () => getItemBySlug(eventId, slug));

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

/**
 * Who in an entry actually counts. A villa that never answered the invitation is
 * not part of it. The lead always counts, so an entry never empties out — it
 * just counts smaller.
 *
 * The draw and the public entrant list both go through here, because a list
 * that showed different villas from the ones in the bowl would be worse than no
 * list at all.
 */
export function countedMembers<T extends { role: "lead" | "member"; acceptance: Acceptance }>(
  members: T[],
): T[] {
  const accepted = members.filter((m) => m.acceptance === "accepted");
  return accepted.length > 0 ? accepted : members.filter((m) => m.role === "lead");
}

/**
 * `Villa 42` is what an account gets when the committee registers a resident
 * without typing their name. It stands in for a missing name rather than being
 * one, and printing it beside the villa number only says the number twice — so
 * it counts as no name at all.
 */
function realName(name: string | null | undefined, villaNo: number): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase() === `villa ${villaNo}` ? null : trimmed;
}

/**
 * Villas that have signed in but carry no real name, so the committee knows
 * which ones to correct — they show as a bare villa number wherever residents
 * are listed.
 */
export async function villasNeedingName(): Promise<number[]> {
  const accounts = await db.query.villaAccounts.findMany({
    columns: { villaId: true, claimedByName: true },
  });
  if (accounts.length === 0) return [];

  const rows = await db.query.villas.findMany({
    where: inArray(villas.id, accounts.map((a) => a.villaId)),
    columns: { id: true, villaNo: true },
  });
  const noOf = new Map(rows.map((v) => [v.id, v.villaNo]));

  return accounts
    .flatMap((a) => {
      const no = noOf.get(a.villaId);
      return no != null && realName(a.claimedByName, no) === null ? [no] : [];
    })
    .sort((a, b) => a - b);
}

export type PublicEntrant = {
  entryId: number;
  villaNos: number[];
  members: { villaNo: number; name: string | null }[];
  /** Slot items only — which session this entry is for. */
  slotId: number | null;
};

/**
 * The entrant list as residents see it, when the committee has opened it.
 * Names are a separate decision from the list itself, so `withNames` off still
 * gives a list — of villa numbers only.
 */
export async function getPublicEntrants(
  itemId: number,
  withNames: boolean,
): Promise<PublicEntrant[]> {
  const rows = await getEntriesWithMembers(itemId);
  if (rows.length === 0) return [];

  // One lookup for the whole list rather than one per villa.
  let nameOf = new Map<number, string>();
  if (withNames) {
    const accounts = await db.query.villaAccounts.findMany({
      where: inArray(
        villaAccounts.villaId,
        rows.flatMap((e) => e.members.map((m) => m.villaId)),
      ),
      columns: { villaId: true, claimedByName: true },
    });
    nameOf = new Map(accounts.map((a) => [a.villaId, a.claimedByName]));
  }

  return rows.map((entry) => {
    const counted = countedMembers(entry.members);
    return {
      entryId: entry.id,
      // What the committee settled on wins over what was asked for.
      slotId: entry.assignedSlotId ?? entry.requestedSlotId,
      villaNos: counted.map((m) => m.villaNo),
      members: counted.map((m) => ({
        villaNo: m.villaNo,
        // The family name they typed for this entry beats the name on the villa
        // login — they wrote it for this occasion, and it is who is turning up.
        name: withNames
          ? realName(
              (m.role === "lead" ? entry.familyName : null) ?? nameOf.get(m.villaId),
              m.villaNo,
            )
          : null,
      })),
    };
  });
}

export type Visibility = { draw: boolean; signup: boolean; names: boolean };

/**
 * What residents are allowed to see about each other. All three are off until
 * the committee turns them on, so nobody's name appears by accident.
 *
 * One read for all of them — these are wanted together on every item page.
 */
export async function getVisibility(eventId: number): Promise<Visibility> {
  const rows = await db.query.settings.findMany({ where: eq(settings.eventId, eventId) });
  const on = (key: string) => rows.find((r) => r.key === key)?.value === "true";
  return {
    draw: on("show_entrants_draw"),
    signup: on("show_entrants_signup"),
    names: on("show_entrant_names"),
  };
}

export const getVisibilityCached = (eventId: number) =>
  cached(`visibility:${eventId}`, 20_000, () => getVisibility(eventId));

/** Whether this item's entrant list is open, given its kind. */
export const entrantsVisible = (item: Item, v: Visibility) =>
  item.kind === "lucky_dip" ? v.draw : v.signup;

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
