import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { LangToggle } from "@/components/LangToggle";
import { PreviewBanner } from "@/components/PreviewBanner";
import { ZariBand } from "@/components/ZariBand";
import { getT } from "@/lib/i18n";
import { requireVilla } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { villaNo } = await requireVilla();
  const { t, lang } = await getT();

  return (
    <div className="flex min-h-dvh flex-col">
      <PreviewBanner lang={lang} />
      <ZariBand height={8} />
      <header className="border-b border-leaf/10 bg-paper">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-3 sm:gap-3 sm:px-5">
          <Link href="/" className="min-w-0 flex-1">
            <span className="block truncate font-[family-name:var(--font-display)] text-[0.85rem] leading-tight text-leaf sm:text-[0.95rem]">
              Ganesh Chaturthi <span className="text-kumkum">2026</span>
            </span>
            {/* The community line is the first thing to go when space is tight. */}
            <span className="hidden truncate text-[0.63rem] uppercase tracking-[0.08em] text-leaf-faint sm:block">
              {t("community")}
            </span>
          </Link>

          <Link
            href="/results"
            className="shrink-0 text-[0.7rem] text-leaf-soft underline underline-offset-2 hover:text-kumkum"
          >
            {t("results")}
          </Link>

          <LangToggle lang={lang} />

          <span className="flex shrink-0 items-baseline gap-1 rounded-md border border-zari/40 bg-zari-pale/50 px-2 py-1">
            <span className="text-[0.6rem] uppercase tracking-wider text-leaf-soft">{t("villa")}</span>
            <span className="villa-no text-sm font-bold text-leaf">{villaNo}</span>
          </span>

        </div>
      </header>

      {/* Bottom padding clears the floating music control. */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-20 pt-6">{children}</main>

      <footer className="mt-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-4 text-[0.7rem] text-leaf-faint">
          <Link href="/schedule" className="underline underline-offset-2 hover:text-kumkum">
            {t("schedule")}
          </Link>
          <span className="hidden sm:inline">{t("community")}</span>
          <form action={signOut}>
            <button type="submit" className="underline underline-offset-2 hover:text-kumkum">
              {t("signOut")}
            </button>
          </form>
        </div>
        <ZariBand height={8} />
      </footer>
    </div>
  );
}
