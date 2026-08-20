/**
 * Shown the instant a resident taps, while the page's queries run. The header,
 * footer and language toggle in the layout stay put and stay interactive — only
 * this middle part swaps — so a tap never looks like it was missed.
 *
 * Shaped like the item cards it stands in for, so the page doesn't jump when
 * the real content lands.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="mt-7 h-7 w-3/5 rounded bg-leaf/10" />
      <div className="mt-2.5 h-4 w-4/5 rounded bg-leaf/[0.07]" />

      <ul className="mt-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="overflow-hidden rounded-lg bg-paper ring-1 ring-leaf/10">
            {/* The gold band is what marks a lucky draw, so the skeleton keeps
                the first two banded — the list reads right before it resolves. */}
            <div className={`h-[9px] ${i < 2 ? "bg-zari/25" : "bg-transparent"}`} />
            <div className="px-4 py-4">
              <div className="h-2.5 w-20 rounded bg-leaf/[0.07]" />
              <div className="mt-2 h-5 w-2/3 rounded bg-leaf/10" />
              <div className="mt-3 h-3.5 w-full rounded bg-leaf/[0.07]" />
              <div className="mt-1.5 h-3.5 w-4/5 rounded bg-leaf/[0.07]" />
              <div className="mt-3.5 flex gap-4 border-t border-leaf/10 pt-3">
                <div className="h-3 w-24 rounded bg-leaf/[0.07]" />
                <div className="ml-auto h-3 w-16 rounded bg-leaf/[0.07]" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
