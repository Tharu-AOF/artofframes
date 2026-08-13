import type { Metadata } from "next";
import { Montserrat, Lato, Great_Vibes } from "next/font/google";
import "./globals.css";
import BackToTop from "@/components/BackToTop";
import ChatWidget from "@/components/chat/ChatWidget";

// ============================================================
// FONTS — change your font pairing HERE (only this section).
// Keep the variable names "--font-display", "--font-sans" and
// "--font-accent" exactly as-is; everything else in the app
// references these.
//
//   Headings : Montserrat      (--font-display)
//   Body     : Lato            (--font-sans)
//   Accent   : Great Vibes     (--font-accent, script, sparingly)
//   Sinhala  : Noto Sans Sinhala (--font-sinhala, self-hosted
//              Sinhala-only subset — see globals.css @font-face)
// ============================================================

// Weights trimmed to the ones actually used (400–700) — fewer
// @font-face declarations means fewer font files for the browser
// to download.
const displayFont = Montserrat({
  variable: "--font-display", // heading/display font
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Lato({
  variable: "--font-sans", // body text font
  subsets: ["latin"],
  weight: ["400", "700"],
});

const accentFont = Great_Vibes({
  variable: "--font-accent", // cursive script accent
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Art of Frames - Elevate Your Everyday Style",
  description: "Discover premium collections crafted for the modern lifestyle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${accentFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#030712] text-white">
        {children}
        {/* Floating back-to-top — present on every page */}
        <BackToTop />
        {/* Floating chat assistant — present on every public page */}
        <ChatWidget />
      </body>
    </html>
  );
}
