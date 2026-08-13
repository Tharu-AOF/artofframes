import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PartnerProgram from "@/components/partner-program/PartnerProgram";

export const metadata: Metadata = {
  title: "Partner Program — Art of Frames",
  description:
    "Become an Art of Frames Partner and turn your network into income — promote our products as a Sales Partner with zero investment, or buy at wholesale prices and resell. Choose the model that works for you.",
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
