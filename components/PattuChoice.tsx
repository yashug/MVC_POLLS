"use client";

import { useState, useTransition } from "react";
import { setPattuChoice } from "@/app/(app)/results/actions";

export function PattuChoice({
  drawResultId, opted, note, lang,
}: { drawResultId: number; opted: boolean | null; note: string; lang: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const choose = (v: boolean) =>
    start(async () => {
      const r = await setPattuChoice(drawResultId, v);
      if (!r.ok) setError(r.error);
    });

  return (
    <div className="mt-4 rounded-md bg-zari-pale/50 p-4">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-zari">
        {lang === "te" ? "పట్టు వస్త్రాలు" : "Pattu vastralu"}
      </p>
      <p lang={lang} className="mt-1.5 text-sm leading-relaxed text-leaf">
        {note}
      </p>

      {opted === null ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button" disabled={pending} onClick={() => choose(true)}
            className="rounded-md bg-leaf px-4 py-2 text-xs font-semibold text-toran disabled:opacity-60"
          >
            {lang === "te" ? "అవును, మేము సమర్పిస్తాం" : "Yes, we'll donate it"}
          </button>
          <button
            type="button" disabled={pending} onClick={() => choose(false)}
            className="rounded-md border border-leaf/25 px-4 py-2 text-xs font-semibold text-leaf-soft disabled:opacity-60"
          >
            {lang === "te" ? "వద్దు, కమిటీ చూసుకోవచ్చు" : "No, the committee can arrange it"}
          </button>
        </div>
      ) : (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-leaf">
          <span className="font-semibold">
            {opted
              ? lang === "te" ? "✓ మీరు సమర్పిస్తున్నారు" : "✓ You're donating the pattu vastralu"
              : lang === "te" ? "కమిటీ ఏర్పాటు చేస్తుంది" : "The committee will arrange it"}
          </span>
          <button
            type="button" disabled={pending} onClick={() => choose(!opted)}
            className="text-xs text-leaf-faint underline underline-offset-2 hover:text-kumkum"
          >
            {lang === "te" ? "మార్చు" : "Change"}
          </button>
        </p>
      )}

      {error && <p role="alert" className="mt-2 text-xs text-kumkum">{error}</p>}
    </div>
  );
}
