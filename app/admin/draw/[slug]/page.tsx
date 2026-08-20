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
        verifyNote:
          "The entrant list was sealed and the seed committed before the wheel moved. Anyone can recompute the same order from these two values.",
        waiting: "Not live yet.",
        getReady: "Starting in",
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
