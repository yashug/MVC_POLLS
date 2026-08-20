import type { Metadata, Viewport } from "next";
import { Fraunces, Karla, Noto_Sans_Telugu, Space_Mono } from "next/font/google";
import { getLang } from "@/lib/i18n";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});
const karla = Karla({ variable: "--font-karla", subsets: ["latin"] });
const notoTelugu = Noto_Sans_Telugu({ variable: "--font-noto-telugu", subsets: ["telugu"] });
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Venice City Ganesh Chaturthi 2026",
  description:
    "Registration and lucky draws for Ganesh Chaturthi at Mirchi Venice City, Kollur — 14 to 19 September 2026.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1f3d2b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${fraunces.variable} ${karla.variable} ${notoTelugu.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
