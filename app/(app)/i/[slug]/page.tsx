import Link from "next/link";
import { notFound } from "next/navigation";
import { EntrantList } from "@/components/EntrantList";
import { EntryPanel } from "@/components/EntryPanel";
import { SlotPicker } from "@/components/SlotPicker";
import { ZariBand } from "@/components/ZariBand";
import { fmtDateTime } from "@/lib/ist";
import { getT, pick } from "@/lib/i18n";
import {
  countEntries, entrantsVisible, getActiveEventCached, getItemBySlugCached, getPublicEntrants,
  getVillaEntry, getVisibilityCached, isEditable, itemState,
} from "@/lib/items";
import {
  allocatedCounts, getSlots, getSlotEntries, getVillaEntryIds, requestCounts, slotLabel,
} from "@/lib/slots";
import { requireVilla } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { villaId, villaNo } = await requireVilla();
  const { t, lang } = await getT();

  const event = await getActiveEventCached();
  const item = await getItemBySlugCached(event.id, slug);
  if (!item) notFound();

  const state = itemState(item);
  if (state === "not_open") notFound();

  const editable = isEditable(item);
  const auctionNote = pick(item, "auctionNote", lang);
  const isDraw = item.kind === "lucky_dip";

  const visibility = await getVisibilityCached(event.id);
  const showEntrants = entrantsVisible(item, visibility);

  // Slot-based items (pooja, annadanam) carry their own booking data. Nothing
  // here depends on anything else here, so it all goes out at once.
  const [count, mine, slotRows, slotEntries, myEntryIds, entrants] = await Promise.all([
    countEntries(item.id),
    getVillaEntry(item.id, villaId),
    item.collectsSlot ? getSlots(item.id) : [],
    item.collectsSlot ? getSlotEntries(item.id) : [],
    item.collectsSlot ? getVillaEntryIds(item.id, villaId) : new Set<number>(),
    showEntrants ? getPublicEntrants(item.id, visibility.names) : [],
  ]);

  // Which of those entries are ours is a filter, not a second trip for the
  // same rows.
  const myBookings = slotEntries.filter((e) => myEntryIds.has(e.id));
  const reqCounts = requestCounts(slotEntries);
  const allocCounts = allocatedCounts(slotEntries);
  // Once anything has been assigned, the page shows assignments rather than requests.
  const allocated = slotEntries.some((e) => e.assignedSlotId != null);
  const slotViews = slotRows.map((s) => ({
    id: s.id,
    label: slotLabel(s, lang),
    capacity: s.capacity,
    requested: reqCounts.get(s.id) ?? 0,
    allocated: allocCounts.get(s.id) ?? 0,
    isLocked: s.isLocked,
    lockNote: lang === "te" ? s.lockNoteTe : s.lockNoteEn,
    adultsCount: s.adultsCount,
    kidsCount: s.kidsCount,
  }));

  return (
    <>
      <Link
        href="/"
        className="inline-block text-xs text-leaf-soft underline underline-offset-4 hover:text-kumkum"
      >
        ← {t("back")}
      </Link>

      <header className="mt-4">
        <span
          className={`text-[0.62rem] font-semibold uppercase tracking-[0.18em] ${
            isDraw ? "text-zari" : "text-leaf-faint"
          }`}
        >
          {isDraw ? t("luckyDraw") : t("signUp")}
        </span>
        <h1
          lang={lang}
          className="mt-1.5 font-[family-name:var(--font-display)] text-3xl leading-tight text-leaf"
        >
          {pick(item, "title", lang)}
        </h1>
        <p lang={lang} className="mt-2.5 text-[0.95rem] leading-relaxed text-leaf-soft">
          {pick(item, "blurb", lang)}
        </p>
      </header>

      {/* What goes to auction — set per item by the committee. */}
      {auctionNote && (
        <aside className="mt-5 overflow-hidden rounded-lg bg-zari-pale/45">
          <ZariBand height={9} />
          <div className="px-4 py-3.5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-zari">
              {lang === "te" ? "గమనిక" : "Please note"}
            </p>
            <p lang={lang} className="mt-1.5 text-sm leading-relaxed text-leaf">
              {auctionNote}
            </p>
          </div>
        </aside>
      )}

      {item.collectsSlot && (
        <p className="mt-4 rounded-md bg-paper px-4 py-3 text-sm leading-relaxed text-leaf-soft ring-1 ring-leaf/10">
          <b className="text-leaf">
            {item.maxEntriesPerVilla === 1 ? t("pickSession") : t("pickSessions")}
          </b>{" "}
          {item.maxEntriesPerVilla === 1 ? t("oversubscribed") : t("committeeAllots")}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t("entriesSoFar")} value={String(count)} mono />
        {item.closesAt && <Stat label={t("closesOn")} value={fmtDateTime(item.closesAt)} />}
        {isDraw && item.drawAt && <Stat label={t("drawOn")} value={fmtDateTime(item.drawAt)} accent />}
      </dl>

      <div className="mt-6">
        {item.collectsSlot ? (
          <SlotPicker
            itemId={item.id}
            mode={item.maxEntriesPerVilla === 1 ? "single" : "multi"}
            collectDetails={item.slug === "pooja-slots"}
            collectAmount={item.allowPartial}
            editable={editable}
            allocated={allocated}
            slots={slotViews}
            bookings={myBookings.map((b) => ({
              entryId: b.id,
              requestedSlotId: b.requestedSlotId,
              assignedSlotId: b.assignedSlotId,
              amountPledged: b.amountPledged,
              isPartial: b.isPartial,
              familyName: b.familyName,
              gotram: b.gotram,
              attendeesCount: b.attendeesCount,
            }))}
            labels={{
              choose: t("choose"), yours: t("yours"), full: t("full"),
              reserved: t("reserved"), places: t("places"), wanted: t("wanted"),
              withdraw: t("withdraw"), change: t("choose"), lockedNow: t("lockedNow"),
              expecting: t("expecting"), amountLabel: t("amountLabel"),
              partialLabel: t("partialLabel"), detailsTitle: t("detailsTitle"),
              familyName: t("familyName"), gotram: t("gotram"), attendees: t("attendees"),
              save: t("save"), saved: t("registered"), movedTo: t("movedTo"),
              allocatedHere: t("allocatedHere"), willDraw: t("willDraw"),
              notPlaced: t("notPlaced"), waitingSlot: t("waitingSlot"),
              amountTbc: t("amountTbc"), lang,
            }}
          />
        ) : (
        <EntryPanel
          itemId={item.id}
          maxGroupSize={item.maxGroupSize}
          editable={editable}
          myVillaId={villaId}
          entry={
            mine
              ? {
                  id: mine.id,
                  leadVillaId: mine.leadVillaId,
                  members: mine.members.map((m) => ({
                    villaId: m.villaId,
                    villaNo: m.villaNo,
                    role: m.role,
                    acceptance: m.acceptance,
                  })),
                }
              : null
          }
          labels={{
            enterDraw: isDraw ? t("enterDraw") : t("signUp"),
            yourEntry: t("yourEntry"), withdraw: t("withdraw"), groupTitle: t("groupTitle"),
            addVilla: t("addVilla"), remove: t("remove"),
            villa: t("villa"), pendingInvite: t("pendingInvite"),
            accept: t("accept"), decline: t("decline"), leaveGroup: t("leaveGroup"),
            lockedNow: t("lockedNow"), registered: t("registered"),
            soloOrGroup: t("soloOrGroup"), pendingNote: t("pendingNote"),
            addOptional: t("addOptional"),
          }}
        />
        )}
      </div>

      {editable && item.closesAt && (
        <p className="mt-4 text-center text-xs text-leaf-faint">
          {t("editUntil")} {fmtDateTime(item.closesAt)}
        </p>
      )}

      {showEntrants && (
        <EntrantList
          entrants={entrants}
          myVillaNo={villaNo}
          lang={lang}
          slotLabels={new Map(slotRows.map((s) => [s.id, slotLabel(s, lang)]))}
          labels={{
            title: isDraw ? t("whoEntered") : t("whoSignedUp"),
            note: item.collectsSlot ? t("entrantNoteSlots") : t("entrantNote"),
            empty: t("noEntrantsYet"),
            you: t("youLabel"),
          }}
        />
      )}
    </>
  );
}

function Stat({
  label, value, mono, accent,
}: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-md bg-paper px-3 py-2.5 ring-1 ring-leaf/10">
      <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-leaf-faint">{label}</dt>
      <dd
        className={`mt-0.5 text-sm font-semibold ${mono ? "villa-no text-xl" : ""} ${
          accent ? "text-zari" : "text-leaf"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
