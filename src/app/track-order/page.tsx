import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TrackOrderView from "@/components/track/TrackOrderView";

export const metadata: Metadata = {
  title: "Track Your Order — Art of Frames",
  description:
    "Track the live delivery journey of your Art of Frames handcrafted photo frames and personalized gifts in Sri Lanka with your Royal Express waybill number.",
  alternates: {
    canonical: "/track-order",
  },
  openGraph: {
    title: "Track Your Order — Art of Frames",
    description:
      "Enter your waybill number to see real-time delivery status for your Art of Frames order.",
    url: "/track-order",
    siteName: "Art of Frames",
    type: "website",
  },
};

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen bg-[#030712]">
      <Navbar activeOverride="track-order" />
      <TrackOrderView />
      <Footer />
    </main>
  );
}
