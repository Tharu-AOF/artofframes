import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ============================================================
// NOT FOUND — minimal 404. Big number, one line, one action.
// The root layout provides the fonts + shell.
// ============================================================

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col bg-[#030712] text-white">
      <Navbar activeOverride="home" />

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p
          className="bg-linear-to-b from-[#E9A23B] via-[#CCA681] to-[#7a5c33] bg-clip-text text-8xl leading-none text-transparent sm:text-9xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          404
        </p>

        <h1 className="mt-6 text-lg text-gray-400 sm:text-xl">
          This page doesn&apos;t exist.
        </h1>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-[44px] items-center rounded-full bg-[#CCA681] px-7 text-sm font-semibold uppercase tracking-wide text-[#5A1020] transition-colors duration-300 hover:bg-[#e3c79a]"
        >
          Back to Home
        </Link>
      </section>

      <Footer />
    </main>
  );
}
