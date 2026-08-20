import Link from "next/link";
import { db } from "@/db";
import { fmtDateTime } from "@/lib/ist";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const rows = await db.query.auditLog.findMany({
    orderBy: (a, { desc }) => [desc(a.at)],
    limit: 300,
  });

  return (
    <div className="min-h-dvh bg-night px-5 py-6 text-zari-pale">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-xs text-zari underline underline-offset-4">
          ← Dashboard
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl">Audit log</h1>
        <p className="mt-1 text-sm text-zari-pale/55">
          Every change, most recent first. Showing the last {rows.length}.
        </p>

        <ul className="mt-5 space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md bg-night-soft px-3 py-2 text-xs ring-1 ring-zari/10"
            >
              <span className="villa-no text-zari/70">{fmtDateTime(r.at)}</span>
              <span className="rounded bg-zari/15 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wider text-zari">
                {r.actorType}
                {r.actorId ? ` ${r.actorId}` : ""}
              </span>
              <span className="font-semibold">{r.action}</span>
              {r.after && (
                <span className="villa-no truncate text-[0.65rem] text-zari-pale/45">{r.after}</span>
              )}
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="mt-6 text-sm text-zari-pale/50">Nothing recorded yet.</p>}
      </div>
    </div>
  );
}
