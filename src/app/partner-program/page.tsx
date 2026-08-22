import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerProgram from "@/components/partner-program/PartnerProgram";

export const metadata: Metadata = {
  title: "Partner Program & Reseller Opportunity — Art of Frames",
  description:
    "Join the Art of Frames Partner Program in Sri Lanka. Earn income as a Sales Partner with zero investment or buy wholesale custom frames and gifts to resell.",
  alternates: {
    canonical: "/partner-program",
  },
  openGraph: {
    title: "Partner Program & Reseller Opportunity — Art of Frames",
    description:
      "Become an Art of Frames Partner in Sri Lanka. Earn income through sales partner and wholesale reseller models.",
    url: "/partner-program",
    siteName: "Art of Frames",
    type: "website",
  },
};

// Static content page — no per-request data to fetch.
export const dynamic = "force-static";

export default function PartnerProgramPage() {
  return (
    <>
      <Navbar activeOverride="partner-program" />
      <PartnerProgram />
      <Footer />
    </>
  );
}
