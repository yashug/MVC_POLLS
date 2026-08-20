import Link from "next/link";
import { PattuChoice } from "@/components/PattuChoice";
import { ZariBand } from "@/components/ZariBand";
import { db } from "@/db";
import { pattuVastralu } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDrawDetail, getLatestDraw } from "@/lib/draw";
import { fmtDateTime } from "@/lib/ist";
import { getT, pick } from "@/lib/i18n";
import { getActiveEvent, getItems } from "@/lib/items";
import { requireVilla } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const { villaId, villaNo } = await requireVilla();
  const { t, lang } = await getT();
  const event = await getActiveEvent();

  const published = [];
  for (const item of await getItems(event.id)) {
    const draw = await getLatestDraw(item.id);
    if (!draw || draw.status !== "published") continue;
    const detail = await getDrawDetail(draw.id);
    if (!detail) continue;

    const winner = detail.ranked[0];
    const winnerEntry = await db.query.entryMembers.findMany({
      where: (m, { eq: e }) => e(m.entryId, winner.entryId),
    });
    const iWon = winnerEntry.some((m) => m.villaId === villaId);
    const pattu = item.slug === "idol-donation"
      ? await db.query.pattuVastralu.findFirst({
          where: eq(pattuVastralu.drawResultId, winner.id),
        })
      : null;

    published.push({ item, draw, detail, winner, iWon, pattu });
  }

  return (
    <>
      <Link href="/" className="text-xs text-leaf-soft underline underline-offset-4 hover:text-kumkum">
        ← {t("back")}
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-leaf">
        {t("results")}
      </h1>

      {published.length === 0 ? (
        <p className="mt-4 rounded-lg bg-paper p-5 text-sm leading-relaxed text-leaf-soft ring-1 ring-leaf/10">
          {lang === "te"
            ? "ఇంకా ఫలితాలు ప్రకటించలేదు. డ్రా పూర్తయ్యాక ఇక్కడ కనిపిస్తాయి."
            : "No results yet. They'll appear here once each draw has been held."}
        </p>
      ) : (
        <ul className="mt-5 space-y-5">
          {published.map(({ item, draw, detail, winner, iWon, pattu }) => (
            <li key={item.id} className="overflow-hidden rounded-lg bg-paper ring-1 ring-zari/40">
              <ZariBand height={11} />
              <div className="px-5 py-5">
                <h2 lang={lang} className="font-[family-name:var(--font-display)] text-lg text-leaf">
                  {pick(item, "title", lang)}
                </h2>

                <div className="mt-3 rounded-md bg-leaf px-4 py-5 text-center">
                  <p className="text-[0.6rem] uppercase tracking-[0.28em] text-zari-light">
                    {t("winner")}
                  </p>
                  <p className="villa-no mt-2 text-4xl font-bold leading-none text-zari-pale">
                    {winner.entrant.villaNos.join("  +  ")}
                  </p>
                </div>

                {iWon && (
                  <p className="mt-3 rounded-md bg-turmeric/25 px-3 py-2 text-center text-sm font-semibold text-leaf">
                    {lang === "te"
                      ? `అభినందనలు! విల్లా ${villaNo} గెలిచింది.`
                      : `Congratulations — villa ${villaNo} is in the winning entry.`}
                  </p>
                )}

                {iWon && item.slug === "idol-donation" && (
                  <PattuChoice
                    drawResultId={winner.id}
                    opted={pattu?.opted ?? null}
                    note={pick(item, "auctionNote", lang)}
                    lang={lang}
                  />
                )}

                {detail.ranked.length > 1 && (
                  <div className="mt-4 border-t border-leaf/10 pt-3">
                    <h3 className="text-[0.6rem] uppercase tracking-[0.18em] text-leaf-faint">
                      {t("runnersUp")}
                    </h3>
                    <ol className="mt-2 space-y-1">
                      {detail.ranked.slice(1, 4).map((r) => (
                        <li key={r.entryId} className="flex items-baseline gap-3 text-sm">
                          <span className="villa-no w-4 text-xs text-leaf-faint">{r.rank}</span>
                          <span className="villa-no text-leaf">{r.entrant.villaNos.join(" + ")}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <details className="mt-4 border-t border-leaf/10 pt-3 text-xs">
                  <summary className="cursor-pointer text-leaf-soft">
                    {lang === "te" ? "ఇది ఎలా నిర్ణయించబడింది" : "How this was decided"}
                  </summary>
                  <p className="mt-2 leading-relaxed text-leaf-faint">{t("verifyNote")}</p>
                  <p className="mt-2 text-leaf-faint">
                    <span className="villa-no">{detail.entrants.length}</span> {t("entrants")} ·{" "}
                    {draw.ranAt ? fmtDateTime(draw.ranAt) : ""}
                  </p>
                  <p className="villa-no mt-1.5 break-all text-[0.65rem] text-leaf-faint">
                    {draw.entrantHash}
                  </p>
                  <p className="villa-no mt-1 break-all text-[0.65rem] text-leaf-faint">
                    seed {draw.seed}
                  </p>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
