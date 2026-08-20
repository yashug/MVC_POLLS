"use client";

import { useTransition } from "react";
import { setLang } from "@/lib/lang-action";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const [pending, start] = useTransition();
  const next: Lang = lang === "en" ? "te" : "en";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setLang(next))}
      className="rounded-full border border-zari/50 px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide text-zari transition-colors hover:bg-zari/10 disabled:opacity-50"
      aria-label={lang === "en" ? "తెలుగులో చూడండి" : "View in English"}
    >
      {lang === "en" ? "తెలుగు" : "EN"}
    </button>
  );
}
