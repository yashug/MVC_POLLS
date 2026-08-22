"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  goLiveAction, publishDrawAction, recordPhysicalWinnerAction, type Res,
} from "@/app/admin/actions";

export function AdminDrawControls({
  slug, drawId, method, status, isLive, entrants,
}: {
  slug: string;
  drawId: number;
  method: "app_wheel" | "physical";
  status: "pending" | "completed" | "published";
  isLive: boolean;
  entrants: { entryId: number; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Res>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="rounded-lg bg-night-soft p-5 ring-1 ring-zari/25">
      <h2 className="text-[0.62rem] uppercase tracking-[0.2em] text-zari">Committee controls</h2>

      {method === "app_wheel" && !isLive && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-zari-pale/70">
            Everyone watching gets a 12-second countdown, then every wheel in the community
            starts turning at the same instant.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => goLiveAction(drawId, 12))}
            className="mt-4 w-full rounded-md bg-zari py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-night transition-colors hover:bg-zari-light disabled:opacity-60"
          >
            {pending ? "…" : "Go live — start the countdown"}
          </button>
        </>
      )}

      {method === "app_wheel" && isLive && status === "pending" && (
        <p className="mt-2 text-sm text-zari-pale/70">The draw is live. Let it run.</p>
      )}

      {method === "physical" && status === "pending" && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-zari-pale/70">
            Print the chits, cut them up and draw one in front of everyone, then pick the
            entry that won.
          </p>
          <a
            href={`/api/draw/${slug}/chits`}
            className="mt-3 block rounded-md border border-zari/30 py-2.5 text-center text-sm font-semibold text-zari-pale hover:bg-zari/10"
          >
            Print the chits (A4 PDF)
          </a>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="flex-1 rounded-md border border-zari/25 bg-night px-3 py-2.5 text-sm text-zari-pale focus:border-zari focus:outline-none"
            >
              <option value="">Choose the winning entry…</option>
              {entrants.map((e, i) => (
                <option key={e.entryId} value={e.entryId}>
                  #{i + 1} — Villa {e.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!pick || pending}
              onClick={() => run(() => recordPhysicalWinnerAction(drawId, Number(pick)))}
              className="rounded-md bg-zari px-5 py-2.5 text-sm font-semibold text-night disabled:opacity-50"
            >
              Record
            </button>
          </div>
        </>
      )}

      {status === "completed" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => publishDrawAction(drawId))}
          className="mt-4 w-full rounded-md bg-zari py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-night disabled:opacity-60"
        >
          Publish to residents
        </button>
      )}

      {status === "published" && (
        <p className="mt-3 rounded-md bg-zari/15 py-2.5 text-center text-sm text-zari">
          ✓ Published — the result is on every resident&apos;s results page
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-kumkum/25 px-3 py-2 text-xs text-kumkum-soft">
          {error}
        </p>
      )}

      <Link
        href="/admin"
        className="mt-4 block text-center text-xs text-zari/60 underline underline-offset-4"
      >
        ← Back to the dashboard
      </Link>
    </div>
  );
}
