import { showsPreviewBanner, APP_ENV } from "@/lib/env";
import type { Lang } from "@/lib/i18n";

/**
 * Shown on every page outside production. Deliberately hard to miss and
 * impossible to dismiss.
 */
export function PreviewBanner({ lang }: { lang: Lang }) {
  if (!showsPreviewBanner) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-kumkum px-4 py-2 text-center text-zari-pale"
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
        {APP_ENV === "preview" ? "Preview" : "Test build"}
      </p>
      <p lang={lang} className="mt-0.5 text-[0.78rem] leading-snug">
        {lang === "te"
          ? "ఇది పరీక్ష కోసం మాత్రమే. ఇక్కడ చేసిన నమోదులు లెక్కించబడవు."
          : "This is for testing only. Nothing you register here counts."}
      </p>
    </div>
  );
}
