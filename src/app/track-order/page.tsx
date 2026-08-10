import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TrackOrderView from "@/components/track/TrackOrderView";

export const metadata: Metadata = {
  title: "Track Your Order — Art of Frames",
  description:
    "Enter your Royal Express waybill number to see the live status and delivery journey of your Art of Frames order.",
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
