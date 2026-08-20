import Link from "next/link";
import { ZariBand } from "@/components/ZariBand";
import { fmtDateTime } from "@/lib/ist";
import { getT, pick } from "@/lib/i18n";
import { InviteBanner } from "@/components/InviteBanner";
import { Shrine } from "@/components/Shrine";
import { getLatestDraw } from "@/lib/draw";
import {
  countEntries, getActiveEvent, getItems, getPendingInvites, getVillaEntry, itemState,
  type ItemState,
} from "@/lib/items";
import { requireVilla } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { villaId } = await requireVilla();
  const { t, lang } = await getT();
  const event = await getActiveEvent();
  const allItems = await getItems(event.id);

  const cards = await Promise.all(
    allItems.map(async (item) => ({
      item,
      state: itemState(item),
      count: await countEntries(item.id),
      mine: await getVillaEntry(item.id, villaId),
    })),
  );

  const invites = await getPendingInvites(villaId);

  // A draw that's been prepared but not yet published is worth watching — people
  // can open the page early and it starts on its own.
  const watchable = [];
  for (const item of allItems) {
    if (item.kind !== "lucky_dip") continue;
    const draw = await getLatestDraw(item.id);
    if (draw && draw.status !== "published") {
      watchable.push({ item, live: !!draw.spinStartsAt });
    }
  }

  const stateLabel: Record<ItemState, string> = {
    not_open: t("notOpenYet"),
    open: t("openNow"),
    closed: t("closed"),
    drawn: t("drawn"),
    published: t("drawn"),
  };

  return (
    <>
      <Shrine lang={lang} />

      <h1 className="mt-7 font-[family-name:var(--font-display)] text-2xl leading-tight text-leaf">
        {lang === "te" ? "మీరు ఏమి చేయాలనుకుంటున్నారు?" : "What would you like to take part in?"}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-leaf-soft">
        {lang === "te"
          ? "బంగారు అంచు ఉన్నవి లక్కీ డ్రా. మిగిలినవి నేరుగా నమోదు."
          : "Cards with a gold border go to a lucky draw. The rest are direct sign-ups."}
      </p>

      <InviteBanner
        invites={invites.map((i) => ({
          entryId: i.entryId,
          title: lang === "te" ? i.itemTitleTe : i.itemTitleEn,
          leadVillaNo: i.leadVillaNo,
        }))}
        labels={{
          title: t("invitesTitle"), invitedYou: t("invitedYou"),
          accept: t("accept"), decline: t("decline"),
        }}
      />

      {watchable.map(({ item, live }) => (
        <Link
          key={item.id}
          href={`/draw/${item.slug}`}
          className="mt-5 block overflow-hidden rounded-lg bg-leaf ring-1 ring-zari/50"
        >
          <ZariBand height={10} tone="night" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="relative flex size-2.5 shrink-0">
              {live && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-turmeric opacity-75" />
              )}
              <span className="relative inline-flex size-2.5 rounded-full bg-turmeric" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6rem] uppercase tracking-[0.2em] text-zari-light">
                {live ? t("drawIsLive") : t("watchLive")}
              </span>
              <span lang={lang} className="block truncate text-sm font-semibold text-zari-pale">
                {pick(item, "title", lang)}
              </span>
            </span>
            <span className="shrink-0 text-zari-light" aria-hidden="true">→</span>
          </div>
        </Link>
      ))}

      <ul className="mt-6 space-y-4">
        {cards.map(({ item, state, count, mine }) => {
          const isDraw = item.kind === "lucky_dip";
          const live = state === "open";
          const title = pick(item, "title", lang);

          const card = (
            <div
              className={`overflow-hidden rounded-lg bg-paper transition-shadow ${
                isDraw ? "ring-1 ring-zari/45" : "ring-1 ring-leaf/10"
              } ${live ? "shadow-[0_8px_24px_-18px_rgba(31,61,43,0.5)] hover:shadow-[0_10px_28px_-16px_rgba(31,61,43,0.5)]" : "opacity-70"}`}
            >
              {isDraw && <ZariBand height={9} />}

              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`text-[0.6rem] font-semibold uppercase tracking-[0.16em] ${
                        isDraw ? "text-zari" : "text-leaf-faint"
                      }`}
                    >
                      {isDraw ? t("luckyDraw") : t("signUp")}
                    </span>
                    <h2
                      lang={lang}
                      className="mt-1 font-[family-name:var(--font-display)] text-lg leading-snug text-leaf"
                    >
                      {title}
                    </h2>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                      live
                        ? "bg-leaf text-toran"
                        : state === "not_open"
                          ? "bg-leaf/10 text-leaf-soft"
                          : "bg-kumkum/10 text-kumkum"
                    }`}
                  >
                    {stateLabel[state]}
                  </span>
                </div>

                <p lang={lang} className="mt-2 text-sm leading-relaxed text-leaf-soft">
                  {pick(item, "blurb", lang)}
                </p>

                <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-leaf/10 pt-3 text-[0.72rem] text-leaf-faint">
                  {/* Counts only — residents never see who else entered. */}
                  <span>
                    <span className="villa-no font-bold text-leaf">{count}</span> {t("entriesSoFar")}
                  </span>
                  {item.closesAt && state !== "not_open" && (
                    <span>
                      {t("closesOn")} {fmtDateTime(item.closesAt)}
                    </span>
                  )}
                  {isDraw && item.drawAt && (
                    <span className="text-zari">
                      {t("drawOn")} {fmtDateTime(item.drawAt)}
                    </span>
                  )}
                  <span
                    className={`ml-auto font-semibold ${mine ? "text-leaf" : "text-leaf-faint"}`}
                  >
                    {mine ? `✓ ${t("registered")}` : t("notRegistered")}
                  </span>
                </div>
              </div>
            </div>
          );

          return (
            <li key={item.id}>
              {state === "not_open" ? (
                <div aria-disabled className="cursor-default">{card}</div>
              ) : (
                <Link href={`/i/${item.slug}`} className="block rounded-lg">
                  {card}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
