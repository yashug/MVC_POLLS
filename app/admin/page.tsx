import Link from "next/link";
import { adminSignOut } from "@/app/admin/login/actions";
import { AdminItemCard, type AdminItem } from "@/components/AdminItemCard";
import { ResetTestData, SettingToggle, VillaTools } from "@/components/AdminTools";
import { PreviewBanner } from "@/components/PreviewBanner";
import { ZariBand } from "@/components/ZariBand";
import { db } from "@/db";
import { villaAccounts } from "@/db/schema";
import { getLatestDraw } from "@/lib/draw";
import { isProduction } from "@/lib/env";
import { toLocalInput } from "@/lib/ist";
import { getActiveEvent, getEntriesWithMembers, getItems, getSetting } from "@/lib/items";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();
  const event = await getActiveEvent();
  const rows = await getItems(event.id);

  const cards: AdminItem[] = await Promise.all(
    rows.map(async (item) => {
      const [entries, draw] = await Promise.all([
        getEntriesWithMembers(item.id),
        getLatestDraw(item.id),
      ]);
      return {
        id: item.id,
        slug: item.slug,
        title: item.titleEn,
        kind: item.kind,
        collectsSlot: item.collectsSlot,
        status: item.status,
        entryCount: entries.length,
        villaCount: entries.reduce((n, e) => n + e.members.length, 0),
        opensAt: toLocalInput(item.opensAt),
        closesAt: toLocalInput(item.closesAt),
        drawAt: toLocalInput(item.drawAt),
        draw: draw ? { id: draw.id, status: draw.status, method: draw.method } : null,
      };
    }),
  );

  const claimed = await db.$count(villaAccounts);
  const excludeCross = (await getSetting(event.id, "exclude_cross_item_winners")) === "true";
  const excludePrev = (await getSetting(event.id, "exclude_previous_winners")) === "true";
  const confirmWinners = (await getSetting(event.id, "winner_confirmation_enabled")) === "true";

  return (
    <div className="min-h-dvh bg-night text-zari-pale">
      <PreviewBanner lang="en" />
      <ZariBand height={8} tone="night" />
      <div className="mx-auto max-w-4xl px-5 py-6">
        <header className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-zari-pale">
            Committee dashboard
          </h1>
          <span className="text-xs text-zari/70">
            {event.name} {event.year}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" className="text-xs text-zari underline underline-offset-4">
              Resident view
            </Link>
            <form action={adminSignOut}>
              <button type="submit" className="text-xs text-zari/70 underline underline-offset-4">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <p className="mt-2 text-sm text-zari-pale/60">
          <b className="villa-no text-zari-pale">{claimed}</b> of 247 villas have signed in.
        </p>

        <ul className="mt-6 space-y-3">
          {cards.map((item) => (
            <AdminItemCard key={item.id} item={item} />
          ))}
        </ul>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-zari-pale">
              Draw rules
            </h2>
            <SettingToggle
              settingKey="exclude_cross_item_winners"
              label="One prize per villa"
              hint="A villa that has already won a draw is left out of later draws. Applies when the draw is prepared."
              value={excludeCross}
            />
            <SettingToggle
              settingKey="exclude_previous_winners"
              label="Exclude last year's winners"
              hint="Nothing recorded for 2026 — this starts working from next year."
              value={excludePrev}
            />
            <SettingToggle
              settingKey="winner_confirmation_enabled"
              label="Winners must confirm"
              hint="Winners get a window to accept before it passes to the runner-up. Off by default."
              value={confirmWinners}
            />
          </div>
          <VillaTools />
        </section>

        {!isProduction && <ResetTestData />}

        <footer className="mt-10 flex gap-4 text-xs text-zari/60">
          <Link href="/admin/report" className="underline underline-offset-4">
            Printable report
          </Link>
          <Link href="/admin/audit" className="underline underline-offset-4">
            Audit log
          </Link>
          <a href="/api/export" className="underline underline-offset-4">
            Export everything (CSV)
          </a>
        </footer>
      </div>
      <ZariBand height={8} tone="night" />
    </div>
  );
}
