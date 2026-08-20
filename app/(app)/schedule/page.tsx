import Link from "next/link";
import { ZariBand } from "@/components/ZariBand";
import { getT, pick } from "@/lib/i18n";
import { getActiveEvent, getItemBySlug } from "@/lib/items";
import { getSlotEntries, getSlots, PERIOD_LABEL } from "@/lib/slots";
import { requireVilla } from "@/lib/session";

export const dynamic = "force-dynamic";

const ORDER = ["morning", "breakfast", "lunch", "evening", "dinner"];

export default async function SchedulePage() {
  const { villaId } = await requireVilla();
  const { t, lang } = await getT();
  const event = await getActiveEvent();

  const pooja = await getItemBySlug(event.id, "pooja-slots");
  const food = await getItemBySlug(event.id, "annadanam");

  const rows: {
    date: string;
    period: string;
    kind: "pooja" | "food";
    villaNos: number[];
    mine: boolean;
    locked: boolean;
    lockNote: string | null;
  }[] = [];

  for (const [item, kind] of [
    [pooja, "pooja"] as const,
    [food, "food"] as const,
  ]) {
    if (!item) continue;
    const slots = await getSlots(item.id);
    const entries = await getSlotEntries(item.id);
    for (const s of slots) {
      const here = entries.filter((e) => e.assignedSlotId === s.id);
      rows.push({
        date: s.date,
        period: s.period,
        kind,
        villaNos: here.flatMap((e) => e.villaNos),
        mine: here.some((e) => e.leadVillaId === villaId),
        locked: s.isLocked,
        lockNote: lang === "te" ? s.lockNoteTe : s.lockNoteEn,
      });
    }
  }

  const days = [...new Set(rows.map((r) => r.date))].sort();

  return (
    <>
      <Link href="/" className="text-xs text-leaf-soft underline underline-offset-4 hover:text-kumkum">
        ← {t("back")}
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-leaf">
        {t("schedule")}
      </h1>
      <p className="mt-1.5 text-sm text-leaf-soft">
        {lang === "te" ? "సెప్టెంబర్ 14 – 19" : "14 – 19 September"}
      </p>

      <ol className="mt-6 space-y-4">
        {days.map((date) => {
          const d = new Date(date + "T12:00:00Z");
          const dayRows = rows
            .filter((r) => r.date === date)
            .sort((a, b) => ORDER.indexOf(a.period) - ORDER.indexOf(b.period));
          const isLast = date === event.endsOn;

          return (
            <li key={date} className="overflow-hidden rounded-lg bg-paper ring-1 ring-leaf/10">
              <ZariBand height={9} />
              <div className="px-4 py-4">
                <h2 className="font-[family-name:var(--font-display)] text-lg text-leaf">
                  {new Intl.DateTimeFormat(lang === "te" ? "te-IN" : "en-IN", {
                    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
                  }).format(d)}
                </h2>

                <ul className="mt-2.5 divide-y divide-leaf/10">
                  {dayRows.map((r, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                      <span className="w-24 shrink-0 text-[0.7rem] uppercase tracking-[0.1em] text-leaf-faint">
                        {PERIOD_LABEL[r.period]?.[lang] ?? r.period}
                      </span>
                      <span className="text-sm font-semibold text-leaf">
                        {r.kind === "pooja"
                          ? lang === "te" ? "పూజ" : "Pooja"
                          : lang === "te" ? "అన్నదానం" : "Annadanam"}
                      </span>
                      {r.locked ? (
                        <span className="text-xs text-clay">{r.lockNote}</span>
                      ) : r.villaNos.length ? (
                        <span className="villa-no text-xs text-leaf-soft">
                          {r.villaNos.join(", ")}
                        </span>
                      ) : (
                        <span className="text-xs text-leaf-faint">
                          {lang === "te" ? "ఇంకా ఖరారు కాలేదు" : "not confirmed yet"}
                        </span>
                      )}
                      {r.mine && (
                        <span className="ml-auto rounded-full bg-leaf px-2 py-0.5 text-[0.6rem] font-semibold text-toran">
                          {lang === "te" ? "మీది" : "yours"}
                        </span>
                      )}
                    </li>
                  ))}

                  {isLast && (
                    <li className="flex items-baseline gap-3 py-2">
                      <span className="w-24 shrink-0 text-[0.7rem] uppercase tracking-[0.1em] text-kumkum">
                        {lang === "te" ? "సాయంత్రం" : "Evening"}
                      </span>
                      <span className="text-sm font-semibold text-kumkum">
                        {lang === "te" ? "గణేష్ నిమజ్జనం" : "Ganesh Nimajjanam"}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 text-center text-xs text-leaf-faint">
        {pooja && pick(pooja, "title", lang)} · {food && pick(food, "title", lang)}
      </p>
    </>
  );
}
