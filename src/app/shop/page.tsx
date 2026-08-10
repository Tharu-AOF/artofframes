import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BulkOrderCTA from "@/components/BulkOrderCTA";
import ShopCollection from "@/components/shop/ShopCollection";
import MaterialsMarquee from "@/components/shop/MaterialsMarquee";
import {
  getShopData,
  getShopOffers,
  getShopProductMeta,
  type ShopProductMeta,
} from "@/lib/shop-db";
import {
  CATEGORY_TREE,
  type Category,
  type Offer,
  type ShopProduct,
} from "@/components/shop/data";

// Site origin (scheme + host) resolved from the request headers —
// used for shareable links and absolute Open Graph URLs. Server-only.
const getOrigin = async (): Promise<string> => {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
};

// Per-request metadata with Open Graph tags, so links shared to
// Facebook/socials render a rich preview. When a product deep link
// (?product=<id>) is shared, the preview uses that product's name,
// description and photo.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const origin = await getOrigin();
  const params = await searchParams;
  const pid = typeof params.product === "string" ? params.product : undefined;

  const baseTitle = "The Collection — Art of Frames";
  const baseDescription =
    "Browse handmade laser-cut keepsakes — keytags, photo frames, signboards, slide cards and wall art, all made to order and ready to be made yours.";

  let product: ShopProductMeta | null = null;
  if (pid) {
    try {
      product = await getShopProductMeta(pid);
    } catch {
      product = null;
    }
  }

  const title = product ? `${product.name} — Art of Frames` : baseTitle;
  const description = product ? product.description : baseDescription;
  const image = product
    ? product.image.startsWith("http")
      ? product.image
      : `${origin}${product.image}`
    : undefined;

  return {
    title,
    description,
    metadataBase: new URL(origin),
    openGraph: {
      title,
      description,
      url: pid ? `/shop?product=${pid}` : "/shop",
      siteName: "Art of Frames",
      type: "website",
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// Fetched live on every request so admin edits appear immediately.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  // If Supabase is unreachable, still render the page shell with
  // the default category tree rather than 500ing the collection.
  let products: ShopProduct[];
  let categories: Category[];
  let offers: Offer[] = [];
  try {
    ({ products, categories } = await getShopData());
  } catch {
    products = [];
    categories = CATEGORY_TREE;
  }
  try {
    offers = await getShopOffers();
  } catch {
    offers = [];
  }

  // The site origin for shareable product links in WhatsApp order
  // messages — resolved once per request so server and client agree
  // (no hydration mismatch) and the recipient's link always works.
  const origin = await getOrigin();

  return (
    <main className="min-h-screen bg-[#030712]">
      <Navbar activeOverride="shop" />
      {/* ShopCollection reads ?category= via useSearchParams — the
          Suspense boundary is required so the rest of the page can
          still render while URL data resolves. */}
      <Suspense fallback={null}>
        <ShopCollection
          products={products}
          categories={categories}
          offers={offers}
          origin={origin}
        />
      </Suspense>
      <MaterialsMarquee />
      <BulkOrderCTA />
      <Footer />
    </main>
  );
}
