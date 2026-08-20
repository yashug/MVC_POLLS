import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { drawResults, draws, entries, entryMembers, items } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getEntriesWithMembers, getSetting } from "@/lib/items";

export type Entrant = { entryId: number; villaNos: number[]; label: string };

/** Deterministic PRNG, seeded from the published seed string. */
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

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Prepare a draw: freeze the entrant list, commit a seed, and compute the full
 * ranking up front. The wheel animation later lands on a result that was already
 * decided — the seed and checksum are published so anyone can recompute it.
 */
export async function prepareDraw(itemId: number, method: "app_wheel" | "physical", by: string) {
  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) throw new Error("Item not found");

  const existing = await db.query.draws.findFirst({
    where: and(eq(draws.itemId, itemId), eq(draws.status, "pending")),
  });
  if (existing) return existing;

  const withMembers = await getEntriesWithMembers(itemId);

  // Admin toggle: keep villas that already won another draw out of this one.
  let eligible = withMembers;
  if ((await getSetting(item.eventId, "exclude_cross_item_winners")) === "true") {
    const wonVillaIds = await villasThatAlreadyWon(item.eventId, itemId);
    eligible = withMembers.filter((e) => !e.members.some((m) => wonVillaIds.has(m.villaId)));
  }

  if (eligible.length === 0) throw new Error("No eligible entries to draw from.");

  const entrants: Entrant[] = eligible.map((e) => ({
    entryId: e.id,
    villaNos: e.members.map((m) => m.villaNo),
    label: e.members.map((m) => m.villaNo).join(" + "),
  }));

  const seed = randomBytes(16).toString("hex");
  const snapshot = JSON.stringify(entrants);
  const entrantHash = sha256(snapshot);

  const [draw] = await db
    .insert(draws)
    .values({
      itemId,
      method,
      seed,
      entrantHash,
      entrantSnapshot: snapshot,
      status: "pending",
    })
    .returning();

  // Fisher–Yates driven by the committed seed — rank 1 wins, the rest are the
  // runner-up order in case a winner backs out.
  const rng = mulberry32(sha256(seed));
  const order = [...entrants];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  await db.insert(drawResults).values(
    order.map((e, i) => ({ drawId: draw.id, entryId: e.entryId, rank: i + 1 })),
  );

  await audit({
    actorType: "admin", actorId: by, action: "draw.prepared",
    entity: "draw", entityId: draw.id,
    after: { itemId, entrants: entrants.length, entrantHash },
  });

  return draw;
}

async function villasThatAlreadyWon(eventId: number, exceptItemId: number) {
  const otherItems = await db.query.items.findMany({ where: eq(items.eventId, eventId) });
  const ids = otherItems.map((i) => i.id).filter((id) => id !== exceptItemId);
  if (ids.length === 0) return new Set<number>();

  const finished = await db.query.draws.findMany({
    where: and(inArray(draws.itemId, ids), inArray(draws.status, ["completed", "published"])),
  });
  if (finished.length === 0) return new Set<number>();

  const winners = await db.query.drawResults.findMany({
    where: and(
      inArray(drawResults.drawId, finished.map((d) => d.id)),
      eq(drawResults.rank, 1),
    ),
  });
  if (winners.length === 0) return new Set<number>();

  const members = await db.query.entryMembers.findMany({
    where: inArray(entryMembers.entryId, winners.map((w) => w.entryId)),
  });
  return new Set(members.map((m) => m.villaId));
}

/** The wheel has landed (or the physical draw happened) — record it. */
export async function completeDraw(drawId: number, by: string) {
  const draw = await db.query.draws.findFirst({ where: eq(draws.id, drawId) });
  if (!draw) throw new Error("Draw not found");

  await db
    .update(draws)
    .set({ status: "completed", ranAt: new Date(), ranBy: by })
    .where(eq(draws.id, drawId));
  await db.update(items).set({ status: "drawn" }).where(eq(items.id, draw.itemId));

  await audit({
    actorType: "admin", actorId: by, action: "draw.completed",
    entity: "draw", entityId: drawId,
  });
}

export async function publishDraw(drawId: number, by: string) {
  const draw = await db.query.draws.findFirst({ where: eq(draws.id, drawId) });
  if (!draw) throw new Error("Draw not found");

  await db.update(draws).set({ status: "published" }).where(eq(draws.id, drawId));
  await db.update(items).set({ status: "published" }).where(eq(items.id, draw.itemId));

  await audit({
    actorType: "admin", actorId: by, action: "draw.published",
    entity: "draw", entityId: drawId,
  });
}

/** Everything the wheel and the results page need. */
export async function getDrawDetail(drawId: number) {
  const draw = await db.query.draws.findFirst({ where: eq(draws.id, drawId) });
  if (!draw) return null;

  const entrants = JSON.parse(draw.entrantSnapshot) as Entrant[];
  const results = await db.query.drawResults.findMany({
    where: eq(drawResults.drawId, drawId),
    orderBy: (r, { asc }) => [asc(r.rank)],
  });
  const byEntry = new Map(entrants.map((e) => [e.entryId, e]));

  return {
    draw,
    entrants,
    ranked: results.map((r) => ({ ...r, entrant: byEntry.get(r.entryId)! })).filter((r) => r.entrant),
  };
}

export async function getLatestDraw(itemId: number) {
  return db.query.draws.findFirst({
    where: eq(draws.itemId, itemId),
    orderBy: (d, { desc }) => [desc(d.id)],
  });
}

/** Reopen an item and discard a prepared-but-unrun draw. */
export async function cancelDraw(drawId: number, by: string) {
  const draw = await db.query.draws.findFirst({ where: eq(draws.id, drawId) });
  if (!draw) return;
  if (draw.status !== "pending") throw new Error("A completed draw can't be cancelled.");

  await db.delete(drawResults).where(eq(drawResults.drawId, drawId));
  await db.delete(draws).where(eq(draws.id, drawId));
  await audit({ actorType: "admin", actorId: by, action: "draw.cancelled", entity: "draw", entityId: drawId });
}

export { sha256 };
export const _entriesTable = entries; // keep the import graph explicit

/**
 * A physical draw happened in front of everyone — record who actually won.
 * The seeded order is kept for the remaining ranks so there's still a
 * runner-up sequence if the winner backs out.
 */
export async function recordPhysicalWinner(drawId: number, winningEntryId: number, by: string) {
  const draw = await db.query.draws.findFirst({ where: eq(draws.id, drawId) });
  if (!draw) throw new Error("Draw not found");
  if (draw.status !== "pending") throw new Error("This draw has already been recorded.");

  const existing = await db.query.drawResults.findMany({
    where: eq(drawResults.drawId, drawId),
    orderBy: (r, { asc }) => [asc(r.rank)],
  });
  if (!existing.some((r) => r.entryId === winningEntryId))
    throw new Error("That entry wasn't in this draw.");

  const reordered = [
    winningEntryId,
    ...existing.map((r) => r.entryId).filter((id) => id !== winningEntryId),
  ];

  await db.delete(drawResults).where(eq(drawResults.drawId, drawId));
  await db
    .insert(drawResults)
    .values(reordered.map((entryId, i) => ({ drawId, entryId, rank: i + 1 })));

  await audit({
    actorType: "admin", actorId: by, action: "draw.physical_winner_recorded",
    entity: "draw", entityId: drawId, after: { winningEntryId },
  });
}
