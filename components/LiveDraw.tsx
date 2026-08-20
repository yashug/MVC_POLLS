"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Wheel } from "@/components/Wheel";
import { ZariBand } from "@/components/ZariBand";
import type { LiveState } from "@/lib/live";

/**
 * The shared watch screen. The committee and all 247 villas render this exact
 * component from the same server clock, so every wheel turns together.
 */
export function LiveDraw({
  slug,
  initial,
  labels,
  back,
  controls,
}: {
  slug: string;
  initial: LiveState;
  labels: {
    entrants: string;
    winner: string;
    runnersUp: string;
    waiting: string;
    getReady: string;
    howChosen: string;
    howChosenBody: string;
    referenceCodes: string;
    referenceNote: string;
    entryListCode: string;
    drawSeedCode: string;
    lang: string;
  };
  /** Way out of the watch screen. Omitted where the surrounding page has its own. */
  back?: { href: string; label: string };
  /** Committee-only buttons, rendered underneath. */
  controls?: React.ReactNode;
}) {
  const [state, setState] = useState<LiveState>(initial);
  const [clockOffset, setClockOffset] = useState(0);
  const [settled, setSettled] = useState(initial.phase === "settled");
  const firedConfetti = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const poll = useCallback(async () => {
    const t0 = Date.now();
    try {
      const res = await fetch(`/api/draw/${slug}/live`, { cache: "no-store" });
      if (!res.ok) return;
      const next: LiveState = await res.json();
      const t1 = Date.now();
      // Correct for round-trip so a wrong phone clock can't desync the spin.
      setClockOffset(next.serverNow - (t0 + t1) / 2);
      setState(next);
    } catch {
      /* a dropped poll is harmless — the next one catches up */
    }
  }, [slug]);

  // Poll until the winner is revealed; after that the animation is purely local.
  useEffect(() => {
    if (state.winnerIndex != null) return;
    const every = state.phase === "armed" ? 700 : 4000;
    const id = setInterval(poll, every);
    return () => clearInterval(id);
  }, [poll, state.phase, state.winnerIndex]);

  // Countdown, ticked off the corrected server clock.
  useEffect(() => {
    const startsAt = state.spinStartsAt;
    if (state.phase !== "armed" || startsAt == null) return;
    const id = setInterval(
      () => setSecondsLeft(Math.ceil((startsAt - (Date.now() + clockOffset)) / 1000)),
      200,
    );
    return () => clearInterval(id);
  }, [state.phase, state.spinStartsAt, clockOffset]);

  const onSettled = useCallback(() => {
    setSettled(true);
    if (!firedConfetti.current) {
      firedConfetti.current = true;
      const burst = (o: confetti.Options) =>
        confetti({ colors: ["#E9B44C", "#D4AF57", "#9E2B25", "#F0E2C0"], ...o });
      burst({ particleCount: 90, spread: 75, origin: { y: 0.45 } });
      setTimeout(() => burst({ particleCount: 60, spread: 100, origin: { x: 0.2, y: 0.5 } }), 220);
      setTimeout(() => burst({ particleCount: 60, spread: 100, origin: { x: 0.8, y: 0.5 } }), 380);
    }
    // Fetch the seed and full ranking now that they're allowed out.
    setTimeout(poll, 400);
  }, [poll]);

  const winner = state.ranked?.[0] ?? null;
  const winnerFromWheel =
    state.winnerIndex != null ? state.entrants[state.winnerIndex] : null;

  return (
    <div className="min-h-dvh bg-night text-zari-pale">
      <ZariBand height={10} tone="night" />
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-7">
        {back && (
          <Link
            href={back.href}
            className="inline-block text-xs text-zari/70 underline underline-offset-4 hover:text-zari"
          >
            ← {back.label}
          </Link>
        )}

        <header className={`${back ? "mt-4" : ""} text-center`}>
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zari">
            {labels.lang === "te" ? "లక్కీ డ్రా" : "Lucky draw"}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight text-zari-pale">
            {state.itemTitle}
          </h1>
          <p className="mt-2 text-sm text-zari-pale/60">
            <b className="villa-no text-zari-pale">{state.entrants.length}</b> {labels.entrants}
          </p>
        </header>

        {state.phase === "idle" && (
          <div className="mt-10 rounded-lg bg-night-soft p-8 text-center ring-1 ring-zari/20">
            <p className="text-sm leading-relaxed text-zari-pale/70">{labels.waiting}</p>
          </div>
        )}

        {state.phase !== "idle" && (
          <>
            {state.phase === "armed" && secondsLeft != null && secondsLeft > 0 && (
              <div className="mt-7 text-center" aria-live="polite">
                <p className="text-[0.7rem] uppercase tracking-[0.3em] text-zari">
                  {labels.getReady}
                </p>
                <p className="villa-no mt-2 text-7xl font-bold leading-none text-turmeric tabular-nums">
                  {secondsLeft}
                </p>
              </div>
            )}

            <div className="mt-7">
              <Wheel
                entrants={state.entrants}
                winnerIndex={state.winnerIndex}
                spinStartsAt={state.spinStartsAt}
                clockOffset={clockOffset}
                onSettled={onSettled}
              />
            </div>
          </>
        )}

        {settled && (winner || winnerFromWheel) && (
          <section className="mt-9">
            <div className="overflow-hidden rounded-xl bg-night-soft ring-1 ring-zari/40">
              <ZariBand height={12} tone="night" />
              <div className="px-6 py-7 text-center">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zari">
                  {labels.winner}
                </p>
                <p className="villa-no mt-3 text-5xl font-bold leading-none text-zari-pale">
                  {(winner?.villaNos ?? winnerFromWheel!.villaNos).join("  +  ")}
                </p>
              </div>
            </div>

            {state.ranked && state.ranked.length > 1 && (
              <div className="mt-5 rounded-lg bg-night-soft/60 p-4 ring-1 ring-zari/15">
                <h2 className="text-[0.62rem] uppercase tracking-[0.2em] text-zari/80">
                  {labels.runnersUp}
                </h2>
                <ol className="mt-2.5 space-y-1.5">
                  {state.ranked.slice(1, 6).map((r) => (
                    <li key={r.rank} className="flex items-baseline gap-3 text-sm">
                      <span className="villa-no w-5 text-xs text-zari/60">{r.rank}</span>
                      <span className="villa-no text-zari-pale">{r.villaNos.join(" + ")}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}

        {controls && <div className="mt-7">{controls}</div>}

        {state.entrantHash && (
          <details className="mt-9 rounded-lg bg-night-soft/50 p-4 text-xs ring-1 ring-zari/15">
            <summary className="cursor-pointer text-zari/80">{labels.howChosen}</summary>

            <p className="mt-2 leading-relaxed text-zari-pale/70">{labels.howChosenBody}</p>

            {/* Demoted on purpose: nobody watching a draw needs to read a hash. */}
            <div className="mt-3 rounded-md bg-night/60 px-3 py-2.5">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zari/70">
                {labels.referenceCodes}
              </p>
              <p className="mt-1 leading-relaxed text-zari-pale/45">{labels.referenceNote}</p>
              <dl className="mt-2 space-y-1.5">
                <div>
                  <dt className="text-[0.62rem] text-zari/60">{labels.entryListCode}</dt>
                  <dd className="villa-no break-all text-[0.62rem] text-zari-pale/70">
                    {state.entrantHash}
                  </dd>
                </div>
                <div>
                  <dt className="text-[0.62rem] text-zari/60">{labels.drawSeedCode}</dt>
                  <dd className="villa-no break-all text-[0.62rem] text-zari-pale/70">
                    {state.seed ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        )}

        {back && settled && (
          <Link
            href={back.href}
            className="mt-7 block rounded-md border border-zari/40 py-3.5 text-center text-sm font-semibold uppercase tracking-[0.14em] text-zari transition-colors hover:border-zari hover:bg-zari/10"
          >
            ← {back.label}
          </Link>
        )}
      </div>
      <ZariBand height={10} tone="night" />
    </div>
  );
}
