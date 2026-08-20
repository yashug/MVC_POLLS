import { db } from "@/db";
import { getEntriesWithMembers, getActiveEvent, getItems } from "@/lib/items";
import { getLatestDraw, getDrawDetail } from "@/lib/draw";
import { requireAdmin } from "@/lib/session";
import { fmtDateTime } from "@/lib/ist";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  await requireAdmin();
  const event = await getActiveEvent();
  const rows: string[][] = [
    ["item", "entry_id", "villas", "lead_villa", "status", "rank", "payment", "registered_at"],
  ];

  for (const item of await getItems(event.id)) {
    const entries = await getEntriesWithMembers(item.id);
    const draw = await getLatestDraw(item.id);
    const detail = draw ? await getDrawDetail(draw.id) : null;
    const rankOf = new Map(detail?.ranked.map((r) => [r.entryId, r.rank]) ?? []);

    for (const e of entries) {
      const pay = item.entryFee
        ? await db.query.payments.findFirst({ where: eq(payments.entryId, e.id) })
        : null;
      rows.push([
        item.titleEn,
        String(e.id),
        e.members.map((m) => m.villaNo).join(" + "),
        String(e.members.find((m) => m.role === "lead")?.villaNo ?? ""),
        e.status,
        String(rankOf.get(e.id) ?? ""),
        pay ? `${pay.status} (Rs ${pay.amount})` : "",
        fmtDateTime(e.createdAt),
      ]);
    }
  }

  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="venice-city-ganesh-2026.csv"`,
    },
  });
}
