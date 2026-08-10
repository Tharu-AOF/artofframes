"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Images,
  BadgePercent,
  Megaphone,
  Ruler,
  Settings,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ============================================================
// ADMIN SHELL — fixed sidebar (desktop) + top bar. Nav items
// highlight via the current path.
// ============================================================

const SIDEBAR_KEY = "aof:admin-sidebar-collapsed";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/gallery", label: "Gallery", icon: Images },
  { href: "/admin/offers", label: "Offers", icon: Megaphone },
  { href: "/admin/discounts", label: "Discounts", icon: BadgePercent },
  { href: "/admin/signboards", label: "Sign Boards", icon: Ruler },
  { href: "/admin/general", label: "General", icon: Settings },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  // Sidebar starts expanded; the collapsed/expanded choice persists
  // per browser so each admin keeps their preferred density.
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIDEBAR_KEY) === "1"
  );

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  };

  const isActive = (item: (typeof navItems)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const signOut = async () => {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/5 bg-[#06060f] transition-[width] duration-300 ease-in-out lg:flex ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <Link
          href="/admin"
          className={`flex items-center gap-3 py-5 ${
            collapsed ? "justify-center px-0" : "px-5"
          }`}
        >
          <div className="relative h-9 w-9 overflow-hidden">
            <Image
              src="/images/aof-logo.png"
              alt="Art of Frames logo"
              fill
              sizes="36px"
              className="object-contain"
            />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p
                className="text-sm text-white"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                Art of Frames
              </p>
              <p className="text-[10px] uppercase tracking-widest text-[#CCA681]">
                Admin Panel
              </p>
            </div>
          )}
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`relative flex h-10 items-center gap-2.5 rounded-lg text-sm transition-all duration-200 ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  active
                    ? "bg-[#CCA681]/12 text-[#CCA681] shadow-[inset_0_0_0_1px_rgba(204,166,129,0.25)]"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[#CCA681]"
                  />
                )}
                <Icon size={16} strokeWidth={1.9} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          className={`flex flex-col gap-2 border-t border-white/5 ${
            collapsed ? "items-center p-3" : "p-4"
          }`}
        >
          <Link
            href="/shop"
            target="_blank"
            title="View Shop"
            className={`flex items-center justify-center gap-2 rounded-lg border border-white/10 text-[11px] font-semibold uppercase tracking-widest text-gray-400 transition-all duration-200 hover:border-[#CCA681]/50 hover:text-[#CCA681] ${
              collapsed ? "h-9 w-9" : "py-2"
            }`}
          >
            <ExternalLink size={13} />
            {!collapsed && "View Shop"}
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            title="Sign out"
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 text-[11px] font-semibold uppercase tracking-widest text-gray-400 transition-all duration-200 hover:border-red-400/40 hover:text-red-300 disabled:opacity-50 ${
              collapsed ? "h-9 w-9" : "py-2"
            }`}
          >
            <LogOut size={13} />
            {!collapsed && (signingOut ? "Signing out…" : "Sign out")}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div
        className={`transition-[padding] duration-300 ease-in-out ${
          collapsed ? "lg:pl-[68px]" : "lg:pl-60"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a14]/95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-3.5 lg:px-8">
            {/* Mobile brand */}
            <Link href="/admin" className="flex items-center gap-2 lg:hidden">
              <div className="relative h-8 w-8 overflow-hidden">
                <Image
                  src="/images/aof-logo.png"
                  alt="Art of Frames logo"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <span
                className="text-sm text-white"
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                Art of Frames
              </span>
            </Link>

            {/* Sidebar collapse toggle (desktop) */}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden cursor-pointer items-center justify-center rounded-lg border border-white/10 p-2 text-gray-400 transition-all duration-200 hover:border-[#CCA681]/50 hover:text-[#CCA681] lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>

            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400 lg:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live · Supabase
            </span>

            <Link
              href="/shop"
              target="_blank"
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-300 transition-all duration-200 hover:border-[#CCA681]/50 hover:text-[#CCA681]"
            >
              <ExternalLink size={12} />
              Shop
            </Link>
          </div>

          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs transition-all duration-200 ${
                    active
                      ? "bg-[#CCA681]/15 text-[#CCA681]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon size={14} strokeWidth={1.9} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
