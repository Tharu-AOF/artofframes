"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  FolderTree,
  Images,
  BadgePercent,
  ArrowRight,
  Database,
} from "lucide-react";
import {
  getCategories,
  getDiscounts,
  getGalleryCount,
  getProductCount,
  getProductSummaries,
} from "@/lib/admin-db";
import { isDiscountLive } from "@/components/shop/data";
import type { ProductSummary } from "@/lib/admin-db";
import { ACard } from "@/components/admin/ui";

// ============================================================
// ADMIN OVERVIEW — quick stats + shortcuts, loaded from
// Supabase on mount.
// ============================================================

// Counts the selectable sidebar categories (skips the virtual
// "All" node at the root).
const countLeaves = (tree: { id: string; children?: unknown[] }[]) =>
  tree.reduce(
    (sum, c) =>
      sum + (c.id === "all" ? 0 : c.children ? c.children.length : 1),
    0
  );

export default function AdminDashboard() {
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [galleryCount, setGalleryCount] = useState(0);
  const [liveDiscounts, setLiveDiscounts] = useState(0);
  const [recent, setRecent] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        // Counts + a 4-row recent list — never the full catalog.
        const [prodCount, cats, galleryCount, discs, rec] = await Promise.all([
          getProductCount(),
          getCategories(),
          getGalleryCount(),
          getDiscounts(),
          getProductSummaries(4),
        ]);
        if (!active) return;
        setProductCount(prodCount);
        setCategoryCount(countLeaves(cats));
        setGalleryCount(galleryCount);
        setLiveDiscounts(discs.filter((d) => isDiscountLive(d)).length);
        setRecent(rec);
      } catch {
        // Leave stats at their zero state if Supabase is unreachable.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: "Products",
      value: productCount,
      href: "/admin/products",
      icon: Package,
      tint: "#CCA681",
    },
    {
      label: "Categories",
      value: categoryCount,
      href: "/admin/categories",
      icon: FolderTree,
      tint: "#0E8C7B",
    },
    {
      label: "Gallery tiles",
      value: galleryCount,
      href: "/admin/gallery",
      icon: Images,
      tint: "#E9A23B",
    },
    {
      label: "Live discounts",
      value: liveDiscounts,
      href: "/admin/discounts",
      icon: BadgePercent,
      tint: "#E2557A",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1
        className="text-2xl tracking-tight text-white sm:text-3xl"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
      >
        Overview
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage the shop page — products, categories and the gallery.
      </p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="group block">
              <ACard className="p-5 transition-all duration-300 group-hover:border-white/20">
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: `${s.tint}18`,
                      boxShadow: `inset 0 0 0 1px ${s.tint}30`,
                    }}
                  >
                    <Icon size={18} strokeWidth={1.9} style={{ color: s.tint }} />
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-gray-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#CCA681]"
                  />
                </div>
                <p
                  className="mt-4 text-3xl text-white"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  {loading ? "…" : s.value}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                  {s.label}
                </p>
              </ACard>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Recent products */}
        <ACard className="p-5">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm text-white"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              Recent Products
            </h2>
            <Link
              href="/admin/products"
              className="text-[11px] font-semibold uppercase tracking-widest text-[#CCA681] transition-colors hover:text-[#e3c79a]"
            >
              Manage →
            </Link>
          </div>
          {loading ? (
            <p className="py-6 text-sm text-gray-500">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="py-6 text-sm text-gray-500">
              No products yet — add your first one.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-white/5">
              {recent.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-sm text-gray-300">{p.name}</span>
                  <span className="text-xs text-[#CCA681]">{p.price}</span>
                </li>
              ))}
            </ul>
          )}
        </ACard>

        {/* Connection status */}
        <ACard className="p-5">
          <h2
            className="text-sm text-white"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            Database
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            The shop and this panel are reading and writing live data through
            Supabase. Changes to products, categories and gallery tiles appear
            on the site immediately.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-2.5 text-xs text-gray-400">
            <Database size={14} className="shrink-0 text-emerald-400" />
            Data source:{" "}
            <span className="text-emerald-400">Supabase (live)</span>
          </div>
        </ACard>
      </div>
    </div>
  );
}
