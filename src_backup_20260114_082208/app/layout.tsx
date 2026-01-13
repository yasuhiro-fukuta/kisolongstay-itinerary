import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import type { Lang } from "@/lib/i18n";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kiso Longstay Itinerary",
  description: "Map-based itinerary builder",
};

async function initialLangFromCookies(): Promise<Lang> {
  try {
    // Next.js 15+ では cookies() が Promise を返すため await が必要です
    // https://nextjs.org/docs/app/api-reference/functions/cookies
    const store = await cookies();
    const v = store.get("kiso_lang")?.value;
    return v === "en" ? "en" : "ja";
  } catch {
    return "ja";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialLang = await initialLangFromCookies();

  return (
    <html lang={initialLang}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100`}
      >
        <Providers initialLang={initialLang}>{children}</Providers>
      </body>
    </html>
  );
}
