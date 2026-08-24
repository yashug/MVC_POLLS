import { Fragment } from "react";
import type { Lang } from "@/lib/i18n";
import type { PublicEntrant } from "@/lib/items";

/**
 * Everyone who has entered, shown only when the committee has opened the list
 * for this kind of item. Group entries stay on one row — the point of a group
 * is that it is one ticket, and splitting them out would read as more entries
 * than there are.
 */
export function EntrantList({
  entrants, myVillaNo, lang, slotLabels, labels,
}: {
  entrants: PublicEntrant[];
  myVillaNo: number;
  lang: Lang;
  /** Empty for items with no sessions. */
  slotLabels: Map<number, string>;
  labels: { title: string; note: string; empty: string; you: string };
}) {
  // Sessions come pre-ordered by the caller. Sponsoring several meals means
  // several entries, so without the session on each row the same villa would
  // appear again and again for no visible reason.
  const order = [...slotLabels.keys()];
  const rows = slotLabels.size
    ? [...entrants].sort(
        (a, b) => order.indexOf(a.slotId ?? -1) - order.indexOf(b.slotId ?? -1),
      )
    : entrants;

  return (
    <section className="mt-8">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-leaf">{labels.title}</h2>
      <p lang={lang} className="mt-1 text-xs leading-relaxed text-leaf-faint">
        {labels.note}
      </p>

      {entrants.length === 0 ? (
        <p className="mt-3 rounded-md bg-paper px-4 py-3 text-sm text-leaf-soft ring-1 ring-leaf/10">
          {labels.empty}
        </p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {rows.map((e, i) => {
            const mine = e.villaNos.includes(myVillaNo);
            const session = e.slotId != null ? slotLabels.get(e.slotId) : undefined;
            const newSession = session != null && rows[i - 1]?.slotId !== e.slotId;
            return (
              <Fragment key={e.entryId}>
              {newSession && (
                <li
                  lang={lang}
                  className="pt-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-leaf-faint"
                >
                  {session}
                </li>
              )}
              <li
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2.5 ring-1 ${
                  mine ? "bg-leaf/10 ring-leaf/25" : "bg-paper ring-leaf/10"
                }`}
              >
                {e.members.map((m, i) => (
                  <span key={m.villaNo} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-leaf-faint">+</span>}
                    <span className="villa-no font-bold text-leaf">{m.villaNo}</span>
                    {m.name && (
                      <span className="text-sm text-leaf-soft">{m.name}</span>
                    )}
                  </span>
                ))}
                {mine && (
                  <span className="ml-auto rounded-full bg-leaf/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-leaf">
                    {labels.you}
                  </span>
                )}
              </li>
              </Fragment>
            );
          })}
        </ol>
      )}
    </section>
  );
}
