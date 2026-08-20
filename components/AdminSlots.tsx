"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  allocateSlotsAction, clearAllocationAction, reassignEntryAction, updateSlotConfig,
  type Res,
} from "@/app/admin/actions";

export type AdminSlotView = {
  id: number;
  label: string;
  capacity: number;
  adultsCount: number;
  kidsCount: number;
  isLocked: boolean;
  lockNote: string | null;
  requested: { entryId: number; villaNos: number[] }[];
  assigned: { entryId: number; villaNos: number[]; amount: number | null; family: string | null }[];
};

export function AdminSlots({
  itemId, itemTitle, slug, slots, unassigned, showCapacity, showAmounts, allocated,
}: {
  itemId: number;
  itemTitle: string;
  slug: string;
  slots: AdminSlotView[];
  unassigned: { entryId: number; villaNos: number[]; requestedLabel: string | null; amount: number | null }[];
  /** Pooja has places per session; annadanam takes as many sponsors as turn up. */
  showCapacity: boolean;
  showAmounts: boolean;
  allocated: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Res>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
    });
  };

  const totalRequests = slots.reduce((n, s) => n + s.requested.length, 0);

  return (
    <div className="min-h-dvh bg-night px-5 py-6 text-zari-pale">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-xs text-zari underline underline-offset-4">
          ← Dashboard
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl">{itemTitle}</h1>
        <p className="mt-1 text-sm text-zari-pale/55">
          <b className="villa-no text-zari-pale">{totalRequests}</b> requests across{" "}
          <b className="villa-no text-zari-pale">{slots.length}</b> sessions
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => allocateSlotsAction(itemId))}
            className="rounded-md bg-zari px-4 py-2 text-xs font-semibold text-night hover:bg-zari-light disabled:opacity-50"
          >
            {allocated ? "Run allocation again" : "Run allocation"}
          </button>
          {allocated && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => clearAllocationAction(itemId))}
              className="rounded-md border border-zari/30 px-4 py-2 text-xs font-semibold text-zari-pale hover:bg-zari/10 disabled:opacity-50"
            >
              Clear allocation
            </button>
          )}
          <Link
            href={`/admin/i/${slug}`}
            className="rounded-md border border-zari/30 px-4 py-2 text-xs font-semibold text-zari-pale hover:bg-zari/10"
          >
            All entries
          </Link>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-zari-pale/50">
          {showCapacity
            ? "Sessions with room for everyone are filled directly. Only oversubscribed sessions go to a seeded draw — villas that miss out land in the pool below for you to move."
            : "Every sponsor is confirmed for the session they asked for. Move anyone between sessions to spread them out."}
        </p>

        <ul className="mt-5 space-y-2.5">
          {slots.map((s) => (
            <li
              key={s.id}
              className={`rounded-lg p-4 ring-1 ${
                s.isLocked ? "bg-night-soft/50 ring-zari/10" : "bg-night-soft ring-zari/20"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="font-semibold text-zari-pale">{s.label}</h2>
                {s.isLocked ? (
                  <span className="rounded bg-clay/25 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-clay">
                    {s.lockNote ?? "Reserved"}
                  </span>
                ) : (
                  <span className="text-xs text-zari-pale/55">
                    <b className="villa-no text-zari-pale">{s.requested.length}</b> asked
                    {showCapacity && (
                      <>
                        {" · "}
                        <b className="villa-no text-zari-pale">{s.assigned.length}</b> of{" "}
                        <span className="villa-no">{s.capacity}</span> confirmed
                      </>
                    )}
                    {!showCapacity && (
                      <>
                        {" · "}
                        <b className="villa-no text-zari-pale">{s.assigned.length}</b> confirmed
                      </>
                    )}
                  </span>
                )}
              </div>

              {!s.isLocked && (
                <>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {showCapacity && (
                      <NumField
                        label="Places"
                        value={s.capacity}
                        onSave={(v) => run(() => updateSlotConfig(s.id, { capacity: v }))}
                      />
                    )}
                    <NumField
                      label="Adults expected"
                      value={s.adultsCount}
                      onSave={(v) => run(() => updateSlotConfig(s.id, { adultsCount: v }))}
                    />
                    <NumField
                      label="Kids expected"
                      value={s.kidsCount}
                      onSave={(v) => run(() => updateSlotConfig(s.id, { kidsCount: v }))}
                    />
                  </div>

                  {s.assigned.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-zari/10 pt-3">
                      {s.assigned.map((a) => (
                        <li key={a.entryId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="villa-no font-bold">{a.villaNos.join(" + ")}</span>
                          {a.family && <span className="text-xs text-zari-pale/50">{a.family}</span>}
                          {showAmounts && a.amount != null && (
                            <span className="villa-no text-xs text-zari">₹{a.amount}</span>
                          )}
                          <select
                            defaultValue={String(s.id)}
                            disabled={pending}
                            onChange={(e) =>
                              run(() =>
                                reassignEntryAction(
                                  a.entryId,
                                  e.target.value === "none" ? null : Number(e.target.value),
                                ),
                              )
                            }
                            className="ml-auto rounded border border-zari/25 bg-night px-2 py-1 text-[0.68rem] text-zari-pale"
                          >
                            {slots
                              .filter((o) => !o.isLocked)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                </option>
                              ))}
                            <option value="none">— unassign —</option>
                          </select>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {unassigned.length > 0 && (
          <section className="mt-6 rounded-lg bg-kumkum/10 p-4 ring-1 ring-kumkum/30">
            <h2 className="font-semibold text-zari-pale">
              Needs a session
              <span className="villa-no ml-2 text-sm text-kumkum-soft">{unassigned.length}</span>
            </h2>
            <p className="mt-1 text-xs text-zari-pale/55">
              These villas missed out on the session they asked for. Put them somewhere with room.
            </p>
            <ul className="mt-3 space-y-1.5">
              {unassigned.map((u) => (
                <li key={u.entryId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="villa-no font-bold">{u.villaNos.join(" + ")}</span>
                  {u.requestedLabel && (
                    <span className="text-xs text-zari-pale/50">asked for {u.requestedLabel}</span>
                  )}
                  {showAmounts && u.amount != null && (
                    <span className="villa-no text-xs text-zari">₹{u.amount}</span>
                  )}
                  <select
                    defaultValue="none"
                    disabled={pending}
                    onChange={(e) =>
                      e.target.value !== "none" &&
                      run(() => reassignEntryAction(u.entryId, Number(e.target.value)))
                    }
                    className="ml-auto rounded border border-zari/25 bg-night px-2 py-1 text-[0.68rem] text-zari-pale"
                  >
                    <option value="none">Move to…</option>
                    {slots
                      .filter((o) => !o.isLocked)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                          {showCapacity ? ` (${o.assigned.length}/${o.capacity})` : ""}
                        </option>
                      ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-kumkum/25 px-3 py-2 text-sm text-kumkum-soft">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function NumField({
  label, value, onSave,
}: { label: string; value: number; onSave: (v: number) => void }) {
  return (
    <label className="block">
      <span className="block text-[0.55rem] uppercase tracking-[0.14em] text-zari/70">{label}</span>
      <input
        type="number"
        min={0}
        defaultValue={value}
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v) && v !== value) onSave(v);
        }}
        className="villa-no mt-1 w-20 rounded-md border border-zari/25 bg-night px-2 py-1.5 text-center text-sm text-zari-pale focus:border-zari focus:outline-none"
      />
    </label>
  );
}
