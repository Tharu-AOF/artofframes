import type { Metadata } from "next";
import { Montserrat, Lato, Great_Vibes } from "next/font/google";
import "./globals.css";
import BackToTop from "@/components/BackToTop";
import ChatWidget from "@/components/chat/ChatWidget";
import JsonLd from "@/components/seo/JsonLd";

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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://artofframes.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Art of Frames | Custom Photo Frames, Wooden Gifts & Wall Decor Sri Lanka",
    template: "%s | Art of Frames",
  },
  description:
    "Art of Frames (artofframes) — Sri Lanka's premier destination for bespoke wooden photo frames, custom engraved gifts, laser-cut wall decor, and customized sign boards. Handcrafted with passion and precision.",
  keywords: [
    "Art of Frames",
    "artofframes",
    "art of frames sri lanka",
    "art of frames 1",
    "custom photo frames sri lanka",
    "wooden photo frames",
    "personalized gifts sri lanka",
    "engraved wooden gifts",
    "laser cut wall art",
    "sign boards sri lanka",
    "custom framing colombo",
    "keepsake gifts sri lanka",
    "birthday gifts sri lanka",
    "anniversary gifts sri lanka",
  ],
  authors: [{ name: "Art of Frames", url: SITE_URL }],
  creator: "Art of Frames",
  publisher: "Art of Frames",
  category: "E-commerce & Home Decor",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: SITE_URL,
    siteName: "Art of Frames",
    title:
      "Art of Frames | Custom Photo Frames, Wooden Gifts & Wall Decor Sri Lanka",
    description:
      "Transform your precious memories into heirloom keepsakes with Art of Frames. Precision laser-cut woodcraft, personalized photo frames, and customized sign boards in Sri Lanka.",
    images: [
      {
        url: "/images/aof-logo.png",
        width: 800,
        height: 800,
        alt: "Art of Frames — Elevate Your Everyday Style",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Art of Frames | Custom Photo Frames & Gifts Sri Lanka",
    description:
      "Bespoke handcrafted wooden frames, personalized gifts & laser-cut wall art in Sri Lanka.",
    images: ["/images/aof-logo.png"],
  },
  verification: {
    google: "google18bd154e752d32ea",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
      <head>
        <JsonLd />
      </head>
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
