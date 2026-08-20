"use client";

import { useState, useTransition } from "react";
import { acknowledgePattuDuty } from "@/app/(app)/results/actions";

/**
 * Shown to the idol donor once the draw is published. The committee decided the
 * pattu vastralu and gaja mala are the donor's responsibility, so this states
 * that plainly and records that they have seen it — it is not a choice.
 */
export function PattuDuty({
  drawResultId, acknowledged, note, lang,
}: { drawResultId: number; acknowledged: boolean; note: string; lang: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-4 rounded-md bg-zari-pale/50 p-4">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-zari">
        {lang === "te" ? "పట్టు వస్త్రాలు & గజమాల" : "Pattu vastralu & gaja mala"}
      </p>
      <p lang={lang} className="mt-1.5 text-sm leading-relaxed text-leaf">
        {note}
      </p>

      {acknowledged ? (
        <p className="mt-3 text-sm font-semibold text-leaf">
          {lang === "te" ? "✓ మీరు ధృవీకరించారు" : "✓ You've confirmed this"}
        </p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await acknowledgePattuDuty(drawResultId);
              if (!r.ok) setError(r.error);
            })
          }
          className="mt-3 rounded-md bg-leaf px-4 py-2 text-xs font-semibold text-toran disabled:opacity-60"
        >
          {lang === "te" ? "అర్థమైంది, మేము ఏర్పాటు చేస్తాం" : "Understood — we'll arrange it"}
        </button>
      )}

      {error && <p role="alert" className="mt-2 text-xs text-kumkum">{error}</p>}
    </div>
  );
}
