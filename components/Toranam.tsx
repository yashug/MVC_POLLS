"use client";

import { useId } from "react";

/**
 * The garland hung across every doorway during Ganesh Chaturthi: mango leaves
 * and marigolds on a strung cord. Built as a repeating swag so it spans any
 * width without stretching, which is how a real toranam is strung too.
 */
export function Toranam({ height = 92 }: { height?: number }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      aria-hidden="true"
      className="toranam block w-full"
      height={height}
      style={{ height }}
    >
      <defs>
        <pattern id={id} width="64" height="92" patternUnits="userSpaceOnUse">
          {/* the cord, sagging between hangs */}
          <path
            d="M0 9 Q32 23 64 9"
            fill="none"
            stroke="#A8791C"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* mango leaf */}
          <g transform="translate(16 15) rotate(-4)">
            <path
              d="M0 0 C7 11 7 27 0 39 C-7 27 -7 11 0 0 Z"
              fill="#1F3D2B"
            />
            <path d="M0 3 L0 35" stroke="#3A5C46" strokeWidth="1.1" />
          </g>

          {/* marigold */}
          <g transform="translate(48 20)">
            <circle r="10" fill="#C97B1E" />
            <circle r="7" fill="#E9B44C" />
            <circle r="3.4" fill="#F2DCA0" />
          </g>

          {/* a second, longer leaf so the repeat does not read mechanically */}
          <g transform="translate(32 19) rotate(6)">
            <path
              d="M0 0 C6 12 6 30 0 44 C-6 30 -6 12 0 0 Z"
              fill="#2C513A"
            />
            <path d="M0 4 L0 40" stroke="#47694F" strokeWidth="1" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}
