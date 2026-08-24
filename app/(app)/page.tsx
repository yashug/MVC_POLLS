import Link from "next/link";
import { ZariBand } from "@/components/ZariBand";
import { fmtDateTime } from "@/lib/ist";
import { getT, pick } from "@/lib/i18n";
import { InviteBanner } from "@/components/InviteBanner";
import { EntrantsReveal } from "@/components/EntrantsReveal";
import { Shrine } from "@/components/Shrine";
import { getLatestDraw } from "@/lib/draw";
import {
  countEntries, entrantsVisible, getActiveEventCached, getItemsCached, getPendingInvites,
  getVisibilityCached, hasEntry, itemState, type ItemState,
} from "@/lib/items";
import { requireVilla } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { villaId } = await requireVilla();
  const { t, lang } = await getT();
  const event = await getActiveEventCached();
  const allItems = await getItemsCached(event.id);

  // Every query below is independent, so they go out together. Run in sequence
  // they were a dozen round trips to the database, and the page waited for all
  // of them end to end.
  const luckyDips = allItems.filter((item) => item.kind === "lucky_dip");

  const [cards, invites, latestDraws, visibility] = await Promise.all([
    Promise.all(
      allItems.map(async (item) => {
        const [count, mine] = await Promise.all([
          countEntries(item.id),
          hasEntry(item.id, villaId),
        ]);
        return { item, state: itemState(item), count, mine };
      }),
    ),
    getPendingInvites(villaId),
    Promise.all(luckyDips.map((item) => getLatestDraw(item.id))),
    getVisibilityCached(event.id),
  ]);

  // A draw that's been prepared but not yet published is worth watching — people
  // can open the page early and it starts on its own.
  const watchable = luckyDips.flatMap((item, i) => {
    const draw = latestDraws[i];
    if (!draw || draw.status === "published") return [];
    return [{ item, live: !!draw.spinStartsAt }];
  });

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

          const canReveal = entrantsVisible(item, visibility) && state !== "not_open";

          const heading = (
            <>
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
            </>
          );

          return (
            <li key={item.id}>
              <div
                className={`overflow-hidden rounded-lg bg-paper transition-shadow ${
                  isDraw ? "ring-1 ring-zari/45" : "ring-1 ring-leaf/10"
                } ${live ? "shadow-[0_8px_24px_-18px_rgba(31,61,43,0.5)] hover:shadow-[0_10px_28px_-16px_rgba(31,61,43,0.5)]" : "opacity-70"}`}
              >
                {isDraw && <ZariBand height={9} />}

                {state === "not_open" ? (
                  <div aria-disabled className="cursor-default px-4 pt-4">{heading}</div>
                ) : (
                  // Fetched while the card is on screen rather than when it is
                  // tapped. Five cards is the whole list, so the cost is bounded,
                  // and it is what makes the tap feel instant on a phone that is
                  // 130ms from the database.
                  <Link href={`/i/${item.slug}`} prefetch className="block rounded-t-lg px-4 pt-4">
                    {heading}
                  </Link>
                )}

                {/* Outside the link on purpose: the count opens the entrant list
                    in place, and a button inside an anchor would navigate. */}
                <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-leaf/10 px-4 pb-4 pt-3 text-[0.72rem] text-leaf-faint">
                  {canReveal ? (
                    <EntrantsReveal
                      itemId={item.id}
                      count={count}
                      lang={lang}
                      labels={{
                        entries: t("entriesSoFar"), seeWho: t("seeWho"), hide: t("hideWho"),
                        loading: t("loadingWho"), empty: t("noEntrantsYet"),
                        failed: t("rollFailed"), you: t("youLabel"),
                      }}
                    />
                  ) : (
                    <span>
                      <span className="villa-no font-bold text-leaf">{count}</span>{" "}
                      {t("entriesSoFar")}
                    </span>
                  )}
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
            </li>
          );
        })}
      </ul>
    </>
  );
}
