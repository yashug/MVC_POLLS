"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type WheelEntrant = { entryId: number; label: string; villaNos: number[] };

/** Deep silk fills — pale zari text reads on every one of them. */
const FILLS = ["#9E2B25", "#1F3D2B", "#B5673F", "#7A5C12"];
const ZARI_PALE = "#F0E2C0";
const SPINS = 6;
export const SPIN_DURATION_MS = 6200;

/** Long, heavy deceleration — a wheel losing momentum, not a slider easing out. */
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * The draw wheel: a saree pallu wrapped into a circle, with the gopuram border
 * from the app header running around its rim.
 *
 * Position is a pure function of server time, so every phone in the community
 * renders the same frame at the same instant — and a device that joins late
 * drops straight into the spin already in progress rather than starting over.
 * The winner is fixed by the committed seed before this ever moves.
 */
export function Wheel({
  entrants,
  winnerIndex,
  spinStartsAt,
  clockOffset = 0,
  onSettled,
}: {
  entrants: WheelEntrant[];
  /** null until the countdown reaches zero — nothing leaks before then. */
  winnerIndex: number | null;
  /** Server epoch ms. null means the wheel is at rest. */
  spinStartsAt: number | null;
  /** serverNow - clientNow, so a wrong device clock doesn't desync the spin. */
  clockOffset?: number;
  onSettled?: () => void;
}) {
  const n = Math.max(entrants.length, 1);
  const seg = 360 / n;
  const showLabels = n <= 40;
  const R = 200;

  const reduceMotion = useRef(false);
  useEffect(() => {
    reduceMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const finalRotation = useMemo(() => {
    if (winnerIndex == null) return 0;
    const centre = winnerIndex * seg + seg / 2;
    return SPINS * 360 + (-90 - centre);
  }, [winnerIndex, seg]);

  const [rotation, setRotation] = useState(0);
  const settledRef = useRef(false);
  const settleCb = useRef(onSettled);
  useEffect(() => {
    settleCb.current = onSettled;
  }, [onSettled]);

  useEffect(() => {
    if (winnerIndex == null || spinStartsAt == null) {
      settledRef.current = false;
      return; // nothing to animate; `displayRotation` below renders it at rest
    }

    if (reduceMotion.current) {
      setRotation(finalRotation);
      if (!settledRef.current) {
        settledRef.current = true;
        settleCb.current?.();
      }
      return;
    }

    let raf = 0;
    const tick = () => {
      const serverNow = Date.now() + clockOffset;
      const t = (serverNow - spinStartsAt) / SPIN_DURATION_MS;

      if (t <= 0) {
        setRotation(0);
      } else if (t >= 1) {
        setRotation(finalRotation);
        if (!settledRef.current) {
          settledRef.current = true;
          settleCb.current?.();
        }
        return; // stop the loop; nothing left to animate
      } else {
        setRotation(finalRotation * easeOutQuart(t));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [winnerIndex, spinStartsAt, finalRotation, clockOffset]);

  // At rest until the winner is revealed, so a cancelled draw snaps back cleanly.
  const displayRotation = winnerIndex == null || spinStartsAt == null ? 0 : rotation;

  const arc = (i: number) => {
    if (n === 1) return `M 0 0 L ${R} 0 A ${R} ${R} 0 1 1 ${-R} 0 A ${R} ${R} 0 1 1 ${R} 0 Z`;
    const a0 = (i * seg * Math.PI) / 180;
    const a1 = ((i + 1) * seg * Math.PI) / 180;
    const large = seg > 180 ? 1 : 0;
    return [
      "M 0 0",
      `L ${(R * Math.cos(a0)).toFixed(2)} ${(R * Math.sin(a0)).toFixed(2)}`,
      `A ${R} ${R} 0 ${large} 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)}`,
      "Z",
    ].join(" ");
  };

  const toothCount = Math.max(48, n * 2);
  const rimTeeth = Array.from({ length: toothCount }, (_, i) => (
    <polygon
      key={i}
      points={`${R + 6},-5 ${R + 6},5 ${R - 4},0`}
      fill={i % 2 ? "#E8C87A" : "#A8791C"}
      transform={`rotate(${(i / toothCount) * 360})`}
    />
  ));

  return (
    <div className="relative mx-auto w-full max-w-[min(88vw,460px)]">
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1">
        <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true">
          <polygon points="17,30 3,2 31,2" fill="#E8C87A" />
          <polygon points="17,25 8,4 26,4" fill="#9E2B25" />
        </svg>
      </div>

      <svg
        viewBox="-232 -232 464 464"
        className="w-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        role="img"
        aria-label={`Draw wheel with ${n} ${n === 1 ? "entry" : "entries"}`}
      >
        <circle r={R + 22} fill="#1B241A" stroke="#A8791C" strokeWidth="2" />
        <g>{rimTeeth}</g>
        <circle r={R + 3} fill="none" stroke="#E8C87A" strokeWidth="2.5" />

        <g style={{ transform: `rotate(${displayRotation}deg)`, transformOrigin: "0 0" }}>
          {entrants.map((e, i) => {
            const centre = i * seg + seg / 2;
            const label = e.villaNos.join("·");
            const base = n > 24 ? 13 : n > 14 ? 15 : 17;
            const size = Math.max(10, Math.min(base, (base * 8) / Math.max(8, label.length)));
            return (
              <g key={e.entryId}>
                <path d={arc(i)} fill={FILLS[i % FILLS.length]} stroke="#D4AF57" strokeWidth="1.1" />
                {showLabels && (
                  <g transform={`rotate(${centre}) translate(${R * 0.63} 0)`}>
                    {/* Counter-rotated so villa numbers stay upright all the way round. */}
                    <text
                      fill={ZARI_PALE}
                      fontSize={size}
                      fontWeight="700"
                      fontFamily="var(--font-mono), monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ transform: `rotate(${-(displayRotation + centre)}deg)` }}
                    >
                      {label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        <circle r="34" fill="#10160F" stroke="#E8C87A" strokeWidth="2.5" />
        <circle r="24" fill="none" stroke="#A8791C" strokeWidth="1" />
        <text y="1" fill="#E8C87A" fontSize="26" textAnchor="middle" dominantBaseline="central" aria-hidden="true">
          ॐ
        </text>
      </svg>

      {!showLabels && (
        <p className="mt-3 text-center text-xs text-[#8aa392]">
          {n} entries — too many to label. The winner is named below once the wheel stops.
        </p>
      )}
    </div>
  );
}
