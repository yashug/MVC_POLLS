import Link from "next/link";
import { ZariBand } from "@/components/ZariBand";
import { getT } from "@/lib/i18n";
import { getActiveEventCached, getItemBySlugCached } from "@/lib/items";
import { getSlotEntries, getSlots, PERIOD_LABEL, PERIOD_TIME } from "@/lib/slots";
import { requireVilla } from "@/lib/session";

export const dynamic = "force-dynamic";

const ORDER = ["morning", "breakfast", "lunch", "evening", "dinner"];

export default async function SchedulePage() {
  const { villaId } = await requireVilla();
  const { t, lang } = await getT();
  const event = await getActiveEventCached();

  const [pooja, food] = await Promise.all([
    getItemBySlugCached(event.id, "pooja-slots"),
    getItemBySlugCached(event.id, "annadanam"),
  ]);

  const rows: {
    date: string;
    period: string;
    kind: "pooja" | "food";
    villaNos: number[];
    mine: boolean;
    locked: boolean;
    lockNote: string | null;
  }[] = [];

  const booked = await Promise.all(
    ([[pooja, "pooja"], [food, "food"]] as const).map(async ([item, kind]) => {
      if (!item) return null;
      const [slots, entries] = await Promise.all([getSlots(item.id), getSlotEntries(item.id)]);
      return { kind, slots, entries };
    }),
  );

  for (const group of booked) {
    if (!group) continue;
    const { kind, slots, entries } = group;
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
                        {PERIOD_TIME[r.period] && (
                          <span className="block normal-case tracking-normal text-leaf-faint/80">
                            {PERIOD_TIME[r.period]}
                          </span>
                        )}
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

      <section className="mt-7 overflow-hidden rounded-lg bg-paper ring-1 ring-leaf/10">
        <ZariBand height={9} />
        <div className="px-4 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-leaf">
            {lang === "te" ? "ఉత్సవం అంతటా" : "Through the festival"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-leaf-faint">
            {lang === "te"
              ? "కమిటీ ఖరారు చేసినవి. తేదీలు, సమయాలు విడిగా ప్రకటిస్తారు."
              : "Confirmed by the committee. Days and times will be announced separately."}
          </p>

          <ul className="mt-3 grid gap-x-5 gap-y-1.5 text-sm text-leaf-soft sm:grid-cols-2">
            {(lang === "te"
              ? [
                  "సరస్వతి పూజ", "కుంకుమార్చన", "గణపతి హోమం",
                  "పిల్లల కార్యక్రమాలు", "నృత్య ప్రదర్శనలు", "సంగీత కార్యక్రమాలు", "డీజే",
                ]
              : [
                  "Saraswathi Pooja", "Kumkumarchana", "Ganapathi Homam",
                  "Children's activities", "Dance performances", "Music programmes", "DJ evening",
                ]
            ).map((x) => (
              <li key={x} className="flex gap-2">
                <span aria-hidden="true" className="text-zari">·</span>
                {x}
              </li>
            ))}
          </ul>

          {/* These are not bookable here, and saying so stops people looking for a form. */}
          <p className="mt-3 text-xs leading-relaxed text-leaf-faint">
            {lang === "te"
              ? "సాంస్కృతిక కార్యక్రమాల నమోదు ఈ యాప్‌లో కాదు — వాట్సాప్ గ్రూప్‌లో జరుగుతుంది."
              : "Cultural programmes are not booked here — sign up in the community WhatsApp group."}
          </p>

          <p className="mt-4 border-t border-leaf/10 pt-3 text-sm leading-relaxed text-leaf">
            <b>{lang === "te" ? "నిమజ్జనం" : "Nimajjanam"}</b>{" "}
            {lang === "te"
              ? "సెప్టెంబర్ 19 సాయంత్రం — ఊరేగింపు, ఉట్టి ఉత్సవం, డప్పులు. వాహనం, మార్గం, పోలీసు అనుమతులు ఏర్పాటు చేయబడ్డాయి."
              : "on the evening of 19 September — procession, Utti Utsavam and drums. Vehicle, route and police permissions are arranged."}
          </p>
        </div>
      </section>
    </>
  );
}
