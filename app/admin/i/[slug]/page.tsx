import { and, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnterForVilla, PaymentRow, RemoveEntry } from "@/components/AdminTools";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { getDrawDetail, getLatestDraw } from "@/lib/draw";
import { fmtDateTime } from "@/lib/ist";
import { getActiveEvent, getEntriesWithMembers, getItemBySlug, isEditable } from "@/lib/items";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EntrantsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const event = await getActiveEvent();
  const item = await getItemBySlug(event.id, slug);
  if (!item) notFound();

  const entries = await getEntriesWithMembers(item.id);
  const draw = await getLatestDraw(item.id);
  const detail = draw ? await getDrawDetail(draw.id) : null;
  const rankOf = new Map(detail?.ranked.map((r) => [r.entryId, r.rank]) ?? []);

  const accounts = await db.query.villaAccounts.findMany();
  const nameOf = new Map(accounts.map((a) => [a.villaId, a.claimedByName]));
  const pays = item.entryFee ? await db.query.payments.findMany() : [];
  const payOf = new Map(pays.map((p) => [p.entryId, p]));

  const totalVillas = entries.reduce((n, e) => n + e.members.length, 0);
  const isOpen = isEditable(item);

  // Which of these the committee entered for someone. The audit log already
  // knows, so nothing has to be stored twice.
  const onBehalf = entries.length
    ? new Set(
        (
          await db
            .select({ entityId: auditLog.entityId })
            .from(auditLog)
            .where(
              and(
                eq(auditLog.action, "entry.created_for_villa"),
                inArray(auditLog.entityId, entries.map((e) => e.id)),
              ),
            )
        ).map((r) => r.entityId),
      )
    : new Set<number | null>();

  return (
    <div className="min-h-dvh bg-night px-5 py-6 text-zari-pale">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-xs text-zari underline underline-offset-4">
          ← Dashboard
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl">{item.titleEn}</h1>
        <p className="mt-1 text-sm text-zari-pale/55">
          <b className="villa-no text-zari-pale">{entries.length}</b> entries ·{" "}
          <b className="villa-no text-zari-pale">{totalVillas}</b> villas
          {item.kind === "lucky_dip" && " · a group counts as one ticket"}
        </p>

        {!item.collectsSlot && (
          <EnterForVilla
            itemId={item.id}
            maxGroupSize={item.maxGroupSize}
            isOpen={isOpen}
            entryFee={item.entryFee}
          />
        )}

        <ul className="mt-5 space-y-2">
          {entries.map((e) => {
            const rank = rankOf.get(e.id);
            const pay = payOf.get(e.id);
            return (
              <li
                key={e.id}
                className={`rounded-md bg-night-soft p-3 ring-1 ${
                  rank === 1 ? "ring-zari" : "ring-zari/12"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {rank && (
                    <span
                      className={`villa-no rounded px-1.5 py-0.5 text-[0.65rem] font-bold ${
                        rank === 1 ? "bg-zari text-night" : "bg-zari/15 text-zari"
                      }`}
                    >
                      {rank === 1 ? "WINNER" : `#${rank}`}
                    </span>
                  )}
                  <span className="villa-no text-lg font-bold">
                    {e.members.map((m) => m.villaNo).join(" + ")}
                  </span>
                  <span className="text-xs text-zari-pale/50">
                    {e.members
                      .map((m) => nameOf.get(m.villaId))
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  {onBehalf.has(e.id) && (
                    <span className="rounded bg-zari/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-zari">
                      entered by committee
                    </span>
                  )}
                  <span className="ml-auto text-[0.68rem] text-zari-pale/40">
                    {fmtDateTime(e.createdAt)}
                  </span>
                </div>

                {e.members.some((m) => m.acceptance === "pending") && (
                  <p className="mt-1.5 text-[0.7rem] text-clay">
                    Waiting on:{" "}
                    {e.members
                      .filter((m) => m.acceptance === "pending")
                      .map((m) => m.villaNo)
                      .join(", ")}
                  </p>
                )}

                {pay && <PaymentRow id={pay.id} amount={pay.amount} status={pay.status} />}

                {isOpen && (
                  <div className="mt-2 flex items-center gap-2 border-t border-zari/10 pt-2">
                    <RemoveEntry
                      entryId={e.id}
                      label={`villa ${e.members.map((m) => m.villaNo).join(" + ")}`}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {entries.length === 0 && (
          <p className="mt-6 rounded-md bg-night-soft p-4 text-sm text-zari-pale/50">
            No entries yet.
          </p>
        )}
      </div>
    </div>
  );
}
