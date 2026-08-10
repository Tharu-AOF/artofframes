import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import { getShopCategories, getShopFeatured, getShopGallery } from "@/lib/shop-db";
import {
  CATEGORY_TREE,
  getCategoryPathName,
  type Category,
} from "@/components/shop/data";
import {
  DEFAULT_PRODUCTS,
  type FeaturedProduct,
} from "@/components/FeaturedProducts";
import {
  DEFAULT_TILES,
  type GalleryTile,
} from "@/components/Gallery";

// Below-fold sections are lazy-loaded so their JavaScript lands in
// separate chunks instead of inflating the initial bundle. SSR stays
// on (default) so the HTML and section anchors (#services, #gallery,
// #contact) are still present for SEO and nav scrollspy.
const Services = dynamic(() => import("@/components/Services"));
const FeaturedProducts = dynamic(() =>
  import("@/components/FeaturedProducts")
);
const Gallery = dynamic(() => import("@/components/Gallery"));
const BulkOrderCTA = dynamic(() => import("@/components/BulkOrderCTA"));
const Reviews = dynamic(() => import("@/components/Reviews"));
const ContactUs = dynamic(() => import("@/components/ContactUs"));

// Home data is fetched server-side and cached 60s (TTL cache in
// shop-db + ISR revalidation), so visitors don't re-hit Supabase on
// every request while admin edits appear within a minute.
export const revalidate = 60;

export default async function Home() {
  // Featured products (show_on_home) — defaults only if the fetch
  // fails; an empty list renders the "curate me" hint.
  let featured: FeaturedProduct[];
  try {
    featured = await getShopFeatured();
  } catch {
    featured = DEFAULT_PRODUCTS;
  }

  // The category tree for the gallery caption labels — falls back to
  // the default tree if Supabase is unreachable.
  let categories: Category[];
  try {
    categories = await getShopCategories();
  } catch {
    categories = CATEGORY_TREE;
  }

  // Home gallery tiles — a small mixed selection (up to 6, max 2 per
  // category) from the curated show_on_home set; defaults on fetch
  // error. The caption is the tile's category path name (or a neutral
  // label for uncategorized tiles).
  const categoryName = (g: { categoryId: string | null }) =>
    g.categoryId
      ? getCategoryPathName(g.categoryId, categories)
      : "From the Studio";
  let tiles: GalleryTile[];
  try {
    const picked: GalleryTile[] = [];
    const byCategory: Record<string, number> = {};
    for (const g of await getShopGallery(true)) {
      if (picked.length >= 6) break;
      const key = g.categoryId ?? "__uncategorized__";
      if ((byCategory[key] ?? 0) >= 2) continue;
      byCategory[key] = (byCategory[key] ?? 0) + 1;
      const caption = categoryName(g);
      picked.push({
        title: g.title,
        category: caption,
        image: g.image,
        color: g.color,
        span: g.span,
        fill: "cover",
        alt: caption || g.title,
      });
    }
    tiles = picked.length ? picked : DEFAULT_TILES;
  } catch {
    tiles = DEFAULT_TILES;
  }

  return (
    <main className="min-h-screen bg-[#030712]">
      <Navbar />
      <Hero />
      <Services />
      <FeaturedProducts products={featured} />
      <Gallery tiles={tiles} />
      <BulkOrderCTA />
      <Reviews />
      <ContactUs />
      <Footer />
    </main>
  );
}
