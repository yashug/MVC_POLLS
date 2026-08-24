"use client";

import { useId, useState, useTransition } from "react";
import { entrantRoll, type RollRow } from "@/app/(app)/actions";
import type { Lang } from "@/lib/i18n";

/**
 * The count on a card is the control: one number that opens into the register
 * of numbers behind it. The names are fetched the first time it is opened and
 * kept after that, so closing and reopening costs nothing.
 */
export function EntrantsReveal({
  itemId, count, lang, labels,
}: {
  itemId: number;
  count: number;
  lang: Lang;
  labels: {
    entries: string; seeWho: string; hide: string; loading: string;
    empty: string; failed: string; you: string;
  };
}) {
  const panelId = useId();
  const [rows, setRows] = useState<RollRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (open) return setOpen(false);
    if (rows) return setOpen(true);

    setFailed(false);
    start(async () => {
      const r = await entrantRoll(itemId);
      if (r.ok) {
        setRows(r.rows);
        setOpen(true);
      } else {
        setFailed(true);
      }
    });
  };

  // Villa numbers alone set as a wrapping row; anything more to say about an
  // entry and it earns a line of its own.
  const detailed = rows?.some((r) => r.names.length > 0 || r.session) ?? false;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={pending || count === 0}
        aria-expanded={open}
        aria-controls={panelId}
        className="group -mx-1 flex items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-leaf/[0.06] disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span>
          <span className="villa-no font-bold text-leaf">{count}</span> {labels.entries}
        </span>
        {count > 0 && (
          <span className="flex items-center gap-1 font-semibold text-leaf-soft">
            <span className="underline decoration-leaf/25 underline-offset-[3px] group-hover:decoration-leaf/60">
              {pending ? labels.loading : open ? labels.hide : labels.seeWho}
            </span>
            <span
              aria-hidden="true"
              className={`transition-transform duration-300 ${open ? "rotate-180" : ""} ${
                pending ? "animate-pulse" : ""
              }`}
            >
              ⌄
            </span>
          </span>
        )}
      </button>

      {failed && (
        <p role="alert" className="order-last basis-full text-[0.72rem] text-kumkum">
          {labels.failed}
        </p>
      )}

      {open && rows && (
        <div id={panelId} className="unroll order-last basis-full border-t border-leaf/10 pt-2.5">
          {rows.length === 0 ? (
            <p className="text-[0.72rem] text-leaf-faint">{labels.empty}</p>
          ) : detailed ? (
            <ol className="space-y-0.5">
              {rows.map((r) => (
                <li
                  key={r.entryId}
                  className={`flex items-baseline gap-2.5 rounded px-1.5 py-1 ${
                    r.mine ? "bg-leaf/[0.07]" : ""
                  }`}
                >
                  <span className="villa-no min-w-10 shrink-0 text-[0.76rem] font-bold text-leaf">
                    {r.villaNos.join(" + ")}
                  </span>
                  <span lang={lang} className="min-w-0 flex-1 text-[0.74rem] leading-snug text-leaf-soft">
                    {r.names.join(", ")}
                    {r.session && (
                      <span className="text-leaf-faint">
                        {r.names.length > 0 && " · "}
                        {r.session}
                      </span>
                    )}
                  </span>
                  {r.mine && (
                    <span className="shrink-0 text-[0.6rem] font-semibold uppercase tracking-wide text-leaf">
                      {labels.you}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <ul className="flex flex-wrap gap-x-2.5 gap-y-1">
              {rows.map((r) => (
                <li
                  key={r.entryId}
                  className={`villa-no text-[0.76rem] font-bold ${
                    r.mine ? "text-leaf underline decoration-leaf/40 underline-offset-[3px]" : "text-leaf-soft"
                  }`}
                >
                  {r.villaNos.join("+")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
