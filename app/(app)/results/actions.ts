"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { drawResults, entryMembers, pattuVastralu } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireVilla } from "@/lib/session";

export type Res = { ok: true } | { ok: false; error: string };

/** The idol winner's optional pattu vastralu offer. Never mandatory. */
export async function setPattuChoice(drawResultId: number, opted: boolean): Promise<Res> {
  const { villaId, villaNo } = await requireVilla();

  const result = await db.query.drawResults.findFirst({
    where: and(eq(drawResults.id, drawResultId), eq(drawResults.rank, 1)),
  });
  if (!result) return { ok: false, error: "That result no longer exists." };

  const member = await db.query.entryMembers.findFirst({
    where: and(eq(entryMembers.entryId, result.entryId), eq(entryMembers.villaId, villaId)),
  });
  if (!member) return { ok: false, error: "Only the winning villas can answer this." };

  const existing = await db.query.pattuVastralu.findFirst({
    where: eq(pattuVastralu.drawResultId, drawResultId),
  });
  if (existing) {
    await db
      .update(pattuVastralu)
      .set({ opted, respondedAt: new Date() })
      .where(eq(pattuVastralu.id, existing.id));
  } else {
    await db.insert(pattuVastralu).values({ drawResultId, opted, respondedAt: new Date() });
  }

  await audit({
    actorType: "villa", actorId: villaNo, action: "pattu_vastralu.choice",
    entity: "draw_result", entityId: drawResultId, after: { opted },
  });
  revalidatePath("/results");
  return { ok: true };
}
