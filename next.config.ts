import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },

  experimental: {
    // Hold the rendered page in the client cache so going back to a screen you
    // just left is instant instead of another round trip to Tokyo. Registration
    // actions all call revalidatePath, which clears this — so your own entry
    // never comes back stale, only other villas' counts can lag, and only for
    // half a minute. The live draw is unaffected: it polls its own API route
    // with cache: "no-store", not RSC.
    staleTimes: { dynamic: 30, static: 180 },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Registration pages must never be cached by a shared proxy. This once
      // covered every path, which also caught /public — so the idol photo and
      // the 465 KB audio track were re-downloaded on every hard load, on the
      // phone plans least able to afford it. Anything with a file extension is
      // an asset and is excluded here.
      {
        source: "/:path((?!.*\\.[a-zA-Z0-9]+$).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      // Assets under /public are swappable by design — drop in an idol photo or
      // a different track and it appears — so this is an hour, not a year.
      // /_next/ is excluded: those filenames carry a build hash and Next already
      // serves them immutable for a year, which this would otherwise shorten.
      {
        source: "/:file((?!_next/).*\\.[a-zA-Z0-9]+$)",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
