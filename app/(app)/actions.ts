"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import { getT } from "@/lib/i18n";
import { entrantsVisible, getPublicEntrants, getVisibility, itemState } from "@/lib/items";
import { requireVilla } from "@/lib/session";
import { getSlots, slotLabel } from "@/lib/slots";

export type RollRow = {
  entryId: number;
  villaNos: number[];
  names: string[];
  session: string | null;
  /** This villa is in this entry — the one row a resident is looking for. */
  mine: boolean;
};

export type RollResult = { ok: true; rows: RollRow[] } | { ok: false; error: string };

/**
 * The entrant list for one card on the home page, fetched when a resident asks
 * for it. Five cards on the page and most of them never opened, so this is not
 * work the home page should be doing on every render.
 *
 * The setting is read straight through rather than from the cache: this is the
 * request that actually discloses the names, so it answers to the switch as it
 * stands right now, not as it stood twenty seconds ago.
 */
export async function entrantRoll(itemId: number): Promise<RollResult> {
  const { villaNo } = await requireVilla();
  const { lang } = await getT();

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) return { ok: false, error: "That item is no longer here." };

  const visibility = await getVisibility(item.eventId);
  if (!entrantsVisible(item, visibility) || itemState(item) === "not_open") {
    return { ok: false, error: "The committee hasn't opened this list." };
  }

  const entrants = await getPublicEntrants(item.id, visibility.names);

  // Sessions order the list for the items that have them, the same way the item
  // page orders it — a resident who opens both should see the one list.
  const sessions = item.collectsSlot ? await getSlots(item.id) : [];
  const labelOf = new Map(sessions.map((s) => [s.id, slotLabel(s, lang)]));
  const rank = new Map(sessions.map((s, i) => [s.id, i]));
  const at = (slotId: number | null) => (slotId != null ? rank.get(slotId) ?? 99 : 99);

  const rows: RollRow[] = [...entrants]
    .sort((a, b) => at(a.slotId) - at(b.slotId))
    .map((e) => ({
      entryId: e.entryId,
      villaNos: e.villaNos,
      names: e.members.map((m) => m.name).filter((n): n is string => !!n),
      session: e.slotId != null ? labelOf.get(e.slotId) ?? null : null,
      mine: e.villaNos.includes(villaNo),
    }));

  return { ok: true, rows };
}
