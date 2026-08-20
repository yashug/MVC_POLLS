import { notFound } from "next/navigation";
import { LiveDraw } from "@/components/LiveDraw";
import { getT, pick } from "@/lib/i18n";
import { getActiveEvent, getItemBySlug } from "@/lib/items";
import { getLiveState } from "@/lib/live";
import { requireVilla } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The community watch screen — same wheel, same clock, on every phone. */
export default async function ResidentDrawPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireVilla();
  const { slug } = await params;
  const { t, lang } = await getT();

  const event = await getActiveEvent();
  const item = await getItemBySlug(event.id, slug);
  if (!item) notFound();

  const state = await getLiveState(slug);
  if (!state) notFound();

  return (
    <LiveDraw
      slug={slug}
      initial={{ ...state, itemTitle: pick(item, "title", lang) }}
      labels={{
        entrants: t("entrants"),
        winner: t("winner"),
        runnersUp: t("runnersUp"),
        waiting: t("notLiveYet"),
        getReady: t("getReady"),
        howChosen: t("howChosen"),
        howChosenBody: t("howChosenBody"),
        referenceCodes: t("referenceCodes"),
        referenceNote: t("referenceNote"),
        entryListCode: t("entryListCode"),
        drawSeedCode: t("drawSeedCode"),
        lang,
      }}
      back={{ href: "/", label: t("back") }}
    />
  );
}
