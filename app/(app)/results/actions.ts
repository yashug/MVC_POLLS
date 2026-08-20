"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { drawResults, entryMembers, pattuVastralu } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireVilla } from "@/lib/session";

export type Res = { ok: true } | { ok: false; error: string };

/**
 * The idol donor confirms they have seen what is expected of them: the pattu
 * vastralu and the gaja mala. There is no decline — the committee agreed this is
 * the donor's responsibility, so this records that they know, not whether they
 * agree. Anyone who genuinely cannot takes it up with the committee directly.
 */
export async function acknowledgePattuDuty(drawResultId: number): Promise<Res> {
  const { villaId, villaNo } = await requireVilla();

  const result = await db.query.drawResults.findFirst({
    where: and(eq(drawResults.id, drawResultId), eq(drawResults.rank, 1)),
  });
  if (!result) return { ok: false, error: "That result no longer exists." };

  const member = await db.query.entryMembers.findFirst({
    where: and(eq(entryMembers.entryId, result.entryId), eq(entryMembers.villaId, villaId)),
  });
  if (!member) return { ok: false, error: "Only the winning villas can confirm this." };

  const existing = await db.query.pattuVastralu.findFirst({
    where: eq(pattuVastralu.drawResultId, drawResultId),
  });
  if (existing) {
    await db
      .update(pattuVastralu)
      .set({ opted: true, respondedAt: new Date(), note: `villa ${villaNo}` })
      .where(eq(pattuVastralu.id, existing.id));
  } else {
    await db.insert(pattuVastralu).values({
      drawResultId,
      opted: true,
      respondedAt: new Date(),
      note: `villa ${villaNo}`,
    });
  }

  await audit({
    actorType: "villa", actorId: villaNo, action: "pattu_vastralu.acknowledged",
    entity: "draw_result", entityId: drawResultId,
  });
  revalidatePath("/results");
  return { ok: true };
}
