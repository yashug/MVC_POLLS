import { getDrawDetail, getLatestDraw } from "@/lib/draw";
import { getActiveEvent, getItemBySlug } from "@/lib/items";

/** Must match SPIN_DURATION_MS in components/Wheel.tsx. */
export const SPIN_DURATION_MS = 6200;

export type LivePhase = "idle" | "armed" | "spinning" | "settled";

export type LiveState = {
  serverNow: number;
  itemTitle: string;
  itemSlug: string;
  phase: LivePhase;
  entrants: { entryId: number; label: string; villaNos: number[] }[];
  entrantHash: string | null;
  spinStartsAt: number | null;
  /** Withheld until the countdown reaches zero. */
  winnerIndex: number | null;
  /** Withheld until the wheel has stopped. */
  seed: string | null;
  ranked: { rank: number; villaNos: number[] }[] | null;
  published: boolean;
};

/**
 * What every watching phone is allowed to know right now.
 *
 * The winner is deliberately absent from the payload until the spin has actually
 * started, so it can't be read out of the network tab during the countdown.
 */
export async function getLiveState(slug: string): Promise<LiveState | null> {
  const event = await getActiveEvent();
  const item = await getItemBySlug(event.id, slug);
  if (!item) return null;

  const serverNow = Date.now();
  const base = {
    serverNow,
    itemTitle: item.titleEn,
    itemSlug: item.slug,
    entrants: [],
    entrantHash: null,
    spinStartsAt: null,
    winnerIndex: null,
    seed: null,
    ranked: null,
    published: false,
  };

  const draw = await getLatestDraw(item.id);
  if (!draw) return { ...base, phase: "idle" };

  const detail = await getDrawDetail(draw.id);
  if (!detail) return { ...base, phase: "idle" };

  const startsAt = draw.spinStartsAt ? draw.spinStartsAt.getTime() : null;
  const published = draw.status === "published";

  let phase: LivePhase = "idle";
  if (startsAt == null) phase = "idle";
  else if (serverNow < startsAt) phase = "armed";
  else if (serverNow < startsAt + SPIN_DURATION_MS) phase = "spinning";
  else phase = "settled";

  // A draw recorded some other way (physical, or before this page existed).
  if (startsAt == null && (draw.status === "completed" || published)) phase = "settled";

  const revealWinner = phase === "spinning" || phase === "settled";
  const winner = detail.ranked[0];
  const winnerIndex = revealWinner
    ? detail.entrants.findIndex((e) => e.entryId === winner?.entryId)
    : null;

  return {
    ...base,
    phase,
    entrants: detail.entrants,
    entrantHash: draw.entrantHash,
    spinStartsAt: startsAt,
    winnerIndex: winnerIndex != null && winnerIndex >= 0 ? winnerIndex : null,
    seed: phase === "settled" ? draw.seed : null,
    ranked:
      phase === "settled"
        ? detail.ranked.map((r) => ({ rank: r.rank, villaNos: r.entrant.villaNos }))
        : null,
    published,
  };
}
