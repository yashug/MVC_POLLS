import Link from "next/link";
import { db } from "@/db";
import { getDrawDetail, getLatestDraw } from "@/lib/draw";
import { fmtDateTime } from "@/lib/ist";
import { getActiveEvent, getEntriesWithMembers, getItems } from "@/lib/items";
import { getSlotEntries, getSlots, slotLabel } from "@/lib/slots";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** One page the committee can print and take to a meeting. */
export default async function ReportPage() {
  await requireAdmin();
  const event = await getActiveEvent();
  const itemRows = await getItems(event.id);
  const pays = await db.query.payments.findMany();

  const blocks = await Promise.all(
    itemRows.map(async (item) => {
      const entries = await getEntriesWithMembers(item.id);
      const draw = await getLatestDraw(item.id);
      const detail = draw && draw.slotId == null ? await getDrawDetail(draw.id) : null;
      const slotRows = item.collectsSlot ? await getSlots(item.id) : [];
      const slotEntries = item.collectsSlot ? await getSlotEntries(item.id) : [];
      const due = pays.filter((p) => entries.some((e) => e.id === p.entryId));
      return { item, entries, detail, slotRows, slotEntries, due };
    }),
  );

  const totalPaid = pays.filter((p) => p.status === "paid").reduce((n, p) => n + p.amount, 0);
  const totalDue = pays.filter((p) => p.status === "due").reduce((n, p) => n + p.amount, 0);
  const pledged = blocks
    .flatMap((b) => b.slotEntries)
    .reduce((n, e) => n + (e.amountPledged ?? 0), 0);

  return (
    <div className="min-h-dvh bg-white px-6 py-8 text-neutral-900 print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-baseline justify-between print:hidden">
          <Link href="/admin" className="text-xs text-neutral-500 underline underline-offset-4">
            ← Dashboard
          </Link>
          <span className="text-xs text-neutral-400">Use your browser&apos;s print to save as PDF</span>
        </div>

        <header className="mt-4 border-b-2 border-neutral-900 pb-3">
          <h1 className="font-[family-name:var(--font-display)] text-2xl">
            {event.name} {event.year} — committee summary
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Mirchi Venice City, Kollur · {event.startsOn} to {event.endsOn} · printed{" "}
            {fmtDateTime(new Date())}
          </p>
        </header>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label="₹50 tokens collected" value={`₹${totalPaid}`} />
          <Stat label="Tokens still due" value={`₹${totalDue}`} />
          <Stat label="Annadanam pledged" value={`₹${pledged}`} />
        </dl>

        {blocks.map(({ item, entries, detail, slotRows, slotEntries }) => (
          <section key={item.id} className="mt-6 break-inside-avoid">
            <h2 className="border-b border-neutral-300 pb-1 font-[family-name:var(--font-display)] text-lg">
              {item.titleEn}
              <span className="ml-2 text-xs font-normal uppercase tracking-wider text-neutral-500">
                {item.kind === "lucky_dip" ? "lucky draw" : "sign-up"} · {item.status}
              </span>
            </h2>

            <p className="mt-1.5 text-sm text-neutral-600">
              <b>{entries.length}</b> entries ·{" "}
              <b>{entries.reduce((n, e) => n + e.members.length, 0)}</b> villas
            </p>

            {detail && detail.ranked.length > 0 && (
              <p className="mt-2 text-sm">
                <b>Winner:</b>{" "}
                <span className="villa-no">{detail.ranked[0].entrant.villaNos.join(" + ")}</span>
                {detail.ranked.length > 1 && (
                  <span className="text-neutral-500">
                    {" "}
                    · runners-up{" "}
                    {detail.ranked.slice(1, 4).map((r) => r.entrant.villaNos.join("+")).join(", ")}
                  </span>
                )}
              </p>
            )}

            {item.collectsSlot && (
              <table className="mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wider text-neutral-500">
                    <th className="py-1 font-medium">Session</th>
                    <th className="py-1 font-medium">Confirmed villas</th>
                    {item.allowPartial && <th className="py-1 text-right font-medium">Pledged</th>}
                    {!item.allowPartial && <th className="py-1 text-right font-medium">Expected</th>}
                  </tr>
                </thead>
                <tbody>
                  {slotRows.map((s) => {
                    const here = slotEntries.filter((e) => e.assignedSlotId === s.id);
                    const amt = here.reduce((n, e) => n + (e.amountPledged ?? 0), 0);
                    return (
                      <tr key={s.id} className="border-b border-neutral-100 align-top">
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          {slotLabel(s, "en")}
                          {s.isLocked && (
                            <span className="ml-1 text-xs text-neutral-500">({s.lockNoteEn})</span>
                          )}
                        </td>
                        <td className="villa-no py-1.5 pr-3">
                          {here.length ? here.map((e) => e.villaNos.join("+")).join(", ") : "—"}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          {item.allowPartial
                            ? amt
                              ? `₹${amt}`
                              : "—"
                            : s.adultsCount + s.kidsCount || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!item.collectsSlot && entries.length > 0 && (
              <p className="villa-no mt-2 text-sm leading-relaxed text-neutral-700">
                {entries.map((e) => e.members.map((m) => m.villaNo).join("+")).join(", ")}
              </p>
            )}

            {slotEntries.some((e) => e.assignedSlotId == null) && (
              <p className="mt-2 text-sm text-red-700">
                Not yet placed:{" "}
                <span className="villa-no">
                  {slotEntries
                    .filter((e) => e.assignedSlotId == null)
                    .map((e) => e.villaNos.join("+"))
                    .join(", ")}
                </span>
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-300 px-3 py-2">
      <dt className="text-[0.6rem] uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className="villa-no mt-0.5 text-lg font-bold">{value}</dd>
    </div>
  );
}
