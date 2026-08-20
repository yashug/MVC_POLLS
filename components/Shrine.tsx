import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { ZariBand } from "@/components/ZariBand";
import type { Lang } from "@/lib/i18n";

const CANDIDATES = ["idol.jpg", "idol.jpeg", "idol.png", "idol.webp"];

/** Drop a photo of the community's own idol at public/idol.jpg and it appears here. */
function findIdolPhoto(): string | null {
  for (const name of CANDIDATES) {
    if (fs.existsSync(path.join(process.cwd(), "public", name))) return `/${name}`;
  }
  return null;
}

/**
 * The mandapam at the top of the noticeboard. A prabhavali arch — the frame every
 * idol is set into — holding the community's own idol once a photo is added, and
 * the sacred syllable until then.
 */
export function Shrine({ lang }: { lang: Lang }) {
  const photo = findIdolPhoto();

  return (
    <section className="overflow-hidden rounded-lg bg-dusk ring-1 ring-zari/35">
      <ZariBand height={10} tone="night" />
      <div className="flex flex-col items-center px-5 py-6">
        <div className="relative h-[132px] w-[118px]">
          {photo ? (
            <>
              <Image
                src={photo}
                alt=""
                fill
                sizes="118px"
                priority
                className="object-cover"
                style={{ clipPath: "url(#shrine-arch)" }}
              />
              <svg aria-hidden="true" width="0" height="0" className="absolute">
                <defs>
                  <clipPath id="shrine-arch" clipPathUnits="objectBoundingBox">
                    <path d="M0.06,1 L0.06,0.42 A0.44,0.38 0 0 1 0.94,0.42 L0.94,1 Z" />
                  </clipPath>
                </defs>
              </svg>
              <svg
                aria-hidden="true"
                viewBox="0 0 118 132"
                className="absolute inset-0"
                fill="none"
              >
                <path
                  d="M7 130 L7 55 A52 45 0 0 1 111 55 L111 130"
                  stroke="#E8C87A"
                  strokeWidth="2.5"
                />
              </svg>
            </>
          ) : (
            <svg viewBox="0 0 118 132" className="h-full w-full" aria-hidden="true">
              <path
                d="M13 130 L13 58 A46 40 0 0 1 105 58 L105 130"
                fill="none"
                stroke="#E8C87A"
                strokeWidth="2.6"
              />
              <path
                d="M6 130 L6 56 A53 46 0 0 1 112 56 L112 130"
                fill="none"
                stroke="#C9A24E"
                strokeWidth="1.5"
              />
              <circle cx="59" cy="12" r="4.5" fill="#E8C87A" />
              <text
                x="59"
                y="88"
                fill="#E8C87A"
                fontSize="52"
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="Noto Sans Devanagari, Kohinoor Devanagari, serif"
              >
                ॐ
              </text>
              <circle cx="28" cy="118" r="4" fill="#E9B44C" />
              <circle cx="90" cy="118" r="4" fill="#E9B44C" />
            </svg>
          )}
        </div>

        <p
          lang="te"
          className="mt-4 text-center font-[family-name:var(--font-telugu)] text-[0.95rem] text-zari-pale"
        >
          శ్రీ గణేశాయ నమః
        </p>
        <p className="mt-1 text-center text-[0.62rem] uppercase tracking-[0.22em] text-zari/70">
          {lang === "te" ? "వేనిస్ సిటీ మండపం" : "Venice City mandapam"}
        </p>
      </div>
    </section>
  );
}
