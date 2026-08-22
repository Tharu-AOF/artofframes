import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BulkOrderCTA from "@/components/BulkOrderCTA";
import GalleryCollection, {
  type GalleryTile,
} from "@/components/gallery/GalleryCollection";
import { getShopCategories, getShopGallery } from "@/lib/shop-db";
import {
  CATEGORY_TREE,
  type Category,
} from "@/components/shop/data";

export const metadata: Metadata = {
  title: "Handcrafted Woodcraft & Framing Gallery — Art of Frames",
  description:
    "Explore our handcrafted collection of bespoke wooden photo frames, laser-cut wall decor, silhouette art, and personalized keepsake gifts in Sri Lanka.",
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: "Handcrafted Woodcraft & Framing Gallery — Art of Frames",
    description:
      "Explore handcrafted photo frames, wooden wall art & personalized keepsake gifts made by Art of Frames.",
    url: "/gallery",
    siteName: "Art of Frames",
    type: "website",
  },
};

// Cached at the CDN edge and revalidated every 60s for blazing fast load times.
export const revalidate = 60;

export default async function GalleryPage() {
  let tiles: GalleryTile[];
  try {
    tiles = await getShopGallery();
  } catch {
    tiles = [];
  }
  // The sidebar tree — falls back to the default tree if Supabase
  // is unreachable so the page still renders.
  let categories: Category[];
  try {
    categories = await getShopCategories();
  } catch {
    categories = CATEGORY_TREE;
  }
  return (
    <main className="min-h-screen bg-[#030712]">
      <Navbar activeOverride="gallery" />
      {/* GalleryCollection reads ?category= via useSearchParams — the
          Suspense boundary is required so the rest of the page can
          still render while URL data resolves. */}
      <Suspense fallback={null}>
        <GalleryCollection tiles={tiles} categories={categories} />
      </Suspense>
      <BulkOrderCTA />
      <Footer />
    </main>
  );
}
