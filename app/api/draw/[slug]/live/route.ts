import { eq } from "drizzle-orm";
import { db } from "@/db";
import { draws } from "@/db/schema";
import { completeDraw, getLatestDraw } from "@/lib/draw";
import { getActiveEvent, getItemBySlug } from "@/lib/items";
import { getLiveState } from "@/lib/live";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session.villaId && !session.isAdmin) {
    return Response.json({ error: "Sign in to watch the draw." }, { status: 401 });
  }

  const { slug } = await params;
  const state = await getLiveState(slug);
  if (!state) return Response.json({ error: "Not found" }, { status: 404 });

  // The wheel has stopped on the clock — record it, whatever happened to the
  // committee's browser. Idempotent, so concurrent pollers are harmless.
  if (state.phase === "settled") {
    const event = await getActiveEvent();
    const item = await getItemBySlug(event.id, slug);
    const draw = item ? await getLatestDraw(item.id) : null;
    if (draw && draw.status === "pending" && draw.spinStartsAt) {
      await completeDraw(draw.id, "system");
      void db; void draws; void eq;
    }
  }

  return Response.json(state, {
    headers: { "cache-control": "no-store, max-age=0" },
  });
}
