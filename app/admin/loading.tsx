/**
 * The committee dashboard reads every entry for every item, so it is the
 * slowest page in the app — and the one most likely to be opened on a laptop
 * mid-draw, when a blank screen is worrying.
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl animate-pulse px-5 py-8" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-7 w-56 rounded bg-leaf/10" />
      <div className="mt-6 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg bg-paper p-5 ring-1 ring-leaf/10">
            <div className="h-5 w-1/3 rounded bg-leaf/10" />
            <div className="mt-3 h-3.5 w-2/3 rounded bg-leaf/[0.07]" />
            <div className="mt-2 h-3.5 w-1/2 rounded bg-leaf/[0.07]" />
          </div>
        ))}
      </div>
    </main>
  );
}
