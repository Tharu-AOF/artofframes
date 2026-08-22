import type { MetadataRoute } from "next";
import { getShopData } from "@/lib/shop-db";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://artofframes.netlify.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/services/sign-boards`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/gallery`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/partner-program`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/track-order`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const shopData = await getShopData();
    const productRoutes: MetadataRoute.Sitemap = (shopData.products ?? []).map(
      (product) => ({
        url: `${SITE_URL}/shop?product=${product.id}`,
        lastModified: product.createdAt ? new Date(product.createdAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    );
    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
