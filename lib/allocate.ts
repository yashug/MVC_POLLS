import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { drawResults, draws, entries, items, slots } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getSlotEntries, type SlotEntry } from "@/lib/slots";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function mulberry32(seedHex: string) {
  let a = parseInt(seedHex.slice(0, 8), 16) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(list: T[], seed: string): T[] {
  const rng = mulberry32(sha256(seed));
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type SlotOutcome = {
  slotId: number;
  label: string;
  capacity: number;
  requested: number;
  allocated: number[];
  missedOut: number[];
  drawId: number | null;
};

/**
 * Allocate every session of a slot-based item.
 *
 * A session that isn't oversubscribed needs no draw — everyone who asked gets it.
 * Only sessions with more requests than places go to a seeded draw, and each of
 * those records its own entrant checksum and seed so it can be checked later.
 * Villas that miss out are left unassigned for the committee to move elsewhere.
 */
export async function allocateSlots(itemId: number, by: string): Promise<SlotOutcome[]> {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) throw new Error("Item not found");

  const slotRows = await db.query.slots.findMany({
    where: eq(slots.itemId, itemId),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  });
  const all = await getSlotEntries(itemId);
  const outcomes: SlotOutcome[] = [];

  for (const slot of slotRows) {
    if (slot.isLocked) continue;

    const asked = all.filter((e) => e.requestedSlotId === slot.id);
    if (asked.length === 0) {
      outcomes.push({
        slotId: slot.id, label: `${slot.date} ${slot.period}`, capacity: slot.capacity,
        requested: 0, allocated: [], missedOut: [], drawId: null,
      });
      continue;
    }

    let winners: SlotEntry[];
    let losers: SlotEntry[] = [];
    let drawId: number | null = null;

    if (asked.length <= slot.capacity) {
      winners = asked; // room for everyone — no draw needed
    } else {
      const seed = randomBytes(16).toString("hex");
      const snapshot = JSON.stringify(
        asked.map((e) => ({ entryId: e.id, villaNos: e.villaNos })),
      );
      const [draw] = await db
        .insert(draws)
        .values({
          itemId,
          slotId: slot.id,
          method: "app_wheel",
          seed,
          entrantHash: sha256(snapshot),
          entrantSnapshot: snapshot,
          status: "completed",
          ranAt: new Date(),
          ranBy: by,
        })
        .returning();
      drawId = draw.id;

      const order = seededShuffle(asked, seed);
      await db.insert(drawResults).values(
        order.map((e, i) => ({ drawId: draw.id, entryId: e.id, rank: i + 1 })),
      );
      winners = order.slice(0, slot.capacity);
      losers = order.slice(slot.capacity);
    }

    for (const w of winners) {
      await db.update(entries).set({ assignedSlotId: slot.id }).where(eq(entries.id, w.id));
    }
    for (const l of losers) {
      await db.update(entries).set({ assignedSlotId: null }).where(eq(entries.id, l.id));
    }

    outcomes.push({
      slotId: slot.id,
      label: `${slot.date} ${slot.period}`,
      capacity: slot.capacity,
      requested: asked.length,
      allocated: winners.flatMap((w) => w.villaNos),
      missedOut: losers.flatMap((l) => l.villaNos),
      drawId,
    });
  }

  await audit({
    actorType: "admin", actorId: by, action: "slots.allocated",
    entity: "item", entityId: itemId,
    after: outcomes.map((o) => ({
      slot: o.label, allocated: o.allocated.length, missed: o.missedOut.length,
    })),
  });

  return outcomes;
}

/** Committee moves one entry to a different session — or clears its assignment. */
export async function reassignEntry(entryId: number, slotId: number | null, by: string) {
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, entryId) });
  if (!entry) throw new Error("Entry not found");

  if (slotId != null) {
    const slot = await db.query.slots.findFirst({
      where: and(eq(slots.id, slotId), eq(slots.itemId, entry.itemId)),
    });
    if (!slot) throw new Error("That session isn't part of this item.");
    if (slot.isLocked) throw new Error("That session is reserved.");
  }

  await db.update(entries).set({ assignedSlotId: slotId, updatedAt: new Date() }).where(eq(entries.id, entryId));
  await audit({
    actorType: "admin", actorId: by, action: "slot.reassigned",
    entity: "entry", entityId: entryId,
    before: { assignedSlotId: entry.assignedSlotId }, after: { assignedSlotId: slotId },
  });
}

/** Wipe every assignment for an item so allocation can be run again. */
export async function clearAllocation(itemId: number, by: string) {
  const rows = await db.query.entries.findMany({ where: eq(entries.itemId, itemId) });
  for (const r of rows) {
    await db.update(entries).set({ assignedSlotId: null }).where(eq(entries.id, r.id));
  }
  const existing = await db.query.draws.findMany({ where: eq(draws.itemId, itemId) });
  for (const d of existing) {
    if (d.slotId == null) continue; // leave single-winner draws alone
    await db.delete(drawResults).where(eq(drawResults.drawId, d.id));
    await db.delete(draws).where(eq(draws.id, d.id));
  }
  await audit({
    actorType: "admin", actorId: by, action: "slots.allocation_cleared",
    entity: "item", entityId: itemId,
  });
}
