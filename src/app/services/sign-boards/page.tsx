import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SignboardCalculator from "@/components/signboard/SignboardCalculator";
import { getShopSignboardSettings } from "@/lib/shop-db";
import { DEFAULT_SIGNBOARD_SETTINGS, type SignboardSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Custom Sign Boards Sri Lanka — Art of Frames",
  description:
    "Custom wooden & acrylic sign boards made to order in Sri Lanka. Precision laser-cut lettering, multi-layer 3D finish, and live instant price estimator.",
  alternates: {
    canonical: "/services/sign-boards",
  },
  openGraph: {
    title: "Custom Sign Boards Sri Lanka — Art of Frames",
    description:
      "Custom laser-cut sign boards for businesses, homes, and events in Sri Lanka. Calculate live prices instantly.",
    url: "/services/sign-boards",
    siteName: "Art of Frames",
    type: "website",
  },
};

// Re-render on every request so admin pricing (materials, rates,
// layer fee) is never served from a stale page cache.
export const dynamic = "force-dynamic";

export default async function SignBoardsPage() {
  // Pricing from the admin Sign Boards settings; falls back to the
  // defaults when settings are unreachable so the page always renders.
  let settings: SignboardSettings = DEFAULT_SIGNBOARD_SETTINGS;
  try {
    settings = await getShopSignboardSettings();
  } catch {
    settings = DEFAULT_SIGNBOARD_SETTINGS;
  }
  return (
    <main className="min-h-screen bg-[#030712]">
      <Navbar activeOverride="services" />

      <section className="relative overflow-clip bg-[#06060f] pb-24 pt-28 lg:pb-32 lg:pt-36">
        {/* ── Ambient orbs ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-1/4 h-[460px] w-[460px] rounded-full bg-[#5A1020]/12 blur-[160px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 -left-40 h-[420px] w-[420px] rounded-full bg-[#0E8C7B]/6 blur-[150px]"
        />
        {/* Dot grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          {/* ── Header ── */}
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-10 bg-[#CCA681]" />
              <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                Custom Sign Boards · Made to Order
              </span>
            </div>
            <h1 className="mt-5">
              <span
                className="block bg-linear-to-r from-[#CCA681] to-[#E9A23B] bg-clip-text text-3xl leading-snug text-transparent sm:text-4xl"
                style={{ fontFamily: "var(--font-accent)", fontWeight: 400 }}
              >
                Sign boards that
              </span>
              <span
                className="mt-2 block text-5xl leading-none tracking-tight text-white sm:text-6xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                speak for you
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-400">
              Laser-cut sign boards in layered depth — from sleek flat shop
              boards to dimensional 3D lettering. Designed, cut and finished
              by hand in our studio, exactly to your size.
            </p>
          </div>

          {/* ── Info chips ── */}
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                title: "Any size",
                text: "Cut precisely to your width and height, in inches, feet or cm.",
              },
              {
                title: "Layered depth",
                text: "Stacked layers give raised, dimensional lettering — 1 layer is flat, 2–3 adds depth.",
              },
              {
                title: "Instant estimate",
                text: "Choose a material, enter your size and layers — the final quote is confirmed on WhatsApp.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h2
                  className="text-sm text-[#CCA681]"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  {c.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                  {c.text}
                </p>
              </div>
            ))}
          </div>

          {/* ── Calculator section ── */}
          <div className="mt-14">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-[1px] w-10 bg-[#CCA681]" />
              <span className="text-xs font-medium uppercase tracking-widest text-[#CCA681]">
                Price Calculator
              </span>
            </div>
            <SignboardCalculator settings={settings} />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
