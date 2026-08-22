import type { Metadata } from "next";
import { headers } from "next/headers";
import { getShopData, getShopSettings } from "@/lib/shop-db";
import CartView from "@/components/cart/CartView";
import { CATEGORY_TREE, type Category, type ShopProduct } from "@/components/shop/data";

// Site origin (scheme + host) resolved from the request headers —
// used for shareable product links inside the WhatsApp order
// message. Server-only, so server and client always agree.
const getOrigin = async (): Promise<string> => {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
};

export const metadata: Metadata = {
  title: "Your Cart — Art of Frames",
  description:
    "Review your selected pieces before ordering — quantities, options and total, with checkout over WhatsApp.",
  robots: {
    index: false,
    follow: true,
  },
};

// Fetched live so the cart always prices against current products,
// discounts and variations.
export const dynamic = "force-dynamic";

export default async function CartPage() {
  // If Supabase is unreachable, still render the page shell with
  // an empty collection rather than 500ing the cart. The delivery
  // setting is fetched separately so a settings failure (e.g. the
  // settings table not migrated yet) never wipes the cart data.
  let products: ShopProduct[] = [];
  let categories: Category[] = CATEGORY_TREE;
  let deliveryCharge = 0;
  try {
    ({ products, categories } = await getShopData());
  } catch {
    products = [];
    categories = CATEGORY_TREE;
  }
  try {
    deliveryCharge = (await getShopSettings()).deliveryCharge;
  } catch {
    deliveryCharge = 0;
  }

  const origin = await getOrigin();

  return (
    <CartView
      products={products}
      categories={categories}
      origin={origin}
      deliveryCharge={deliveryCharge}
    />
  );
}
