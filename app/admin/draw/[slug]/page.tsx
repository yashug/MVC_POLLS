import { notFound } from "next/navigation";
import { AdminDrawControls } from "@/components/AdminDrawControls";
import { LiveDraw } from "@/components/LiveDraw";
import { getLatestDraw } from "@/lib/draw";
import { getActiveEvent, getItemBySlug } from "@/lib/items";
import { getLiveState } from "@/lib/live";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminDrawPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;

  const event = await getActiveEvent();
  const item = await getItemBySlug(event.id, slug);
  if (!item) notFound();

  const draw = await getLatestDraw(item.id);
  if (!draw) notFound();

  const state = await getLiveState(slug);
  if (!state) notFound();

  return (
    <LiveDraw
      slug={slug}
      initial={state}
      labels={{
        entrants: "entrants",
        winner: "Winner",
        runnersUp: "Runners-up, in order",
        waiting: "Not live yet.",
        getReady: "Starting in",
        howChosen: "How the winner was chosen",
        // The committee gets the precise version; residents get plain language.
        howChosenBody:
          "The entrant list was sealed and the seed committed before the wheel moved. The same order can be recomputed from these two values at any time.",
        referenceCodes: "Reference codes",
        referenceNote: "Keep these with the minutes so the draw can be checked again later.",
        entryListCode: "Entry list checksum (SHA-256)",
        drawSeedCode: "Draw seed",
        lang: "en",
      }}
      controls={
        <AdminDrawControls
          drawId={draw.id}
          method={draw.method}
          status={draw.status}
          isLive={!!draw.spinStartsAt}
          entrants={state.entrants}
        />
      }
    />
  );
}
