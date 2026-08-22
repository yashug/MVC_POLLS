import { buildChitSheetPdf } from "@/lib/chits";
import { getDrawDetail, getLatestDraw } from "@/lib/draw";
import { getActiveEvent, getItemBySlug } from "@/lib/items";
import { fmtDateTime } from "@/lib/ist";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The chits for a manual draw, as an A4 PDF to print, cut and fold. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;

  const event = await getActiveEvent();
  const item = await getItemBySlug(event.id, slug);
  if (!item) return new Response("Item not found", { status: 404 });

  const draw = await getLatestDraw(item.id);
  if (!draw) return new Response("Prepare the draw first — the chits come from the sealed entrant list.", { status: 404 });

  const detail = await getDrawDetail(draw.id);
  if (!detail || detail.entrants.length === 0) {
    return new Response("This draw has no entrants.", { status: 404 });
  }

  // Straight from the snapshot, so a chit's number is the same number the
  // committee picks from on the record-the-winner screen.
  const pdf = await buildChitSheetPdf({
    itemTitle: item.titleEn,
    eventName: event.name,
    drawId: draw.id,
    entrantHash: draw.entrantHash,
    preparedAt: fmtDateTime(Date.now()),
    entrants: detail.entrants.map((e) => ({ entryId: e.entryId, label: e.label })),
  });

  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="chits-${slug}-draw-${draw.id}.pdf"`,
      "cache-control": "no-store, max-age=0",
    },
  });
}
