"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * The signature element: a Gadwal-style silk border. Gold hairline, a row of
 * Narayanpet checks, and gopuram triangles. It runs across the top of the app
 * and wraps around again as the rim of the draw wheel.
 *
 * The motif is designed on a 24x14 tile and scaled to the requested height, so
 * it repeats at its natural size instead of stretching across the element.
 */
export function ZariBand({
  className,
  tone = "day",
  height = 14,
}: {
  className?: string;
  tone?: "day" | "night";
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  const bright = tone === "night" ? "#E8C87A" : "#D4AF57";
  const deep = tone === "night" ? "#C08F2A" : "#A8791C";
  const scale = height / 14;

  return (
    <svg
      aria-hidden="true"
      className={cn("block w-full", className)}
      height={height}
      style={{ height, display: "block" }}
    >
      <defs>
        <pattern
          id={id}
          width={24}
          height={14}
          patternUnits="userSpaceOnUse"
          patternTransform={`scale(${scale})`}
        >
          <rect x="0" y="0" width="24" height="2.5" fill={bright} />
          <rect x="0" y="3.6" width="24" height="0.9" fill={deep} />
          <rect x="2" y="5.6" width="3.4" height="3.4" fill={deep} />
          <rect x="10.3" y="5.6" width="3.4" height="3.4" fill={bright} />
          <rect x="18.6" y="5.6" width="3.4" height="3.4" fill={deep} />
          <polygon points="6.5,10.2 17.5,10.2 12,14" fill={bright} />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}
