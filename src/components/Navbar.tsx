"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartDrawer from "@/components/cart/CartDrawer";
import { toggleCartDrawer, useCartCount } from "@/lib/cart-store";
import { ArrowRight, ChevronDown, ShoppingCart, Truck } from "lucide-react";

// ============================================================
// NAV TYPOGRAPHY — single place to tune all nav font settings.
// font / weight / size are each defined ONCE here and used by
// both the desktop and mobile nav.
// ============================================================
const navTypography = {
  // Logo / title
  title: {
    fontFamily: "var(--font-display)",
    fontWeight: 500,
    fontSize: "1.25rem", // text-xl
    letterSpacing: "0.025em", // tracking-wide
  },
  // Desktop nav links
  desktop: {
    inactive: {
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      fontSize: "1.0rem", // text-sm
    },
    active: {
      fontFamily: "var(--font-accent)",
      fontWeight: 400,
      fontSize: "1.575rem",
    },
  },
  // Mobile menu links
  mobile: {
    inactive: {
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      fontSize: "1rem", // base
    },
    active: {
      fontFamily: "var(--font-accent)",
      fontWeight: 400,
      fontSize: "1.5rem", // 2xl
    },
  },
};

const Navbar = ({ activeOverride }: { activeOverride?: string }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Desktop sub-nav panel (Services) — opens on hover / focus.
  const [servicesOpen, setServicesOpen] = useState(false);
  // Mobile sub-menu expansion for nav items that have children (Services).
  const [servicesSubOpen, setServicesSubOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(activeOverride ?? "home");
  // Live cart count — the cart store persists to localStorage and
  // notifies via useSyncExternalStore, so the badge stays in sync
  // with the cart page without any event plumbing.
  const cartCount = useCartCount();
  // Active state for the cart icon — lit up while on the cart page.
  const pathname = usePathname();
  const cartActive = pathname === "/cart";

  // Scroll handling — the nav's solid/blurred background follows the
  // scroll position on every page, exactly like the home page. The
  // scrollspy (active link per section) only runs on pages that have
  // those sections; other pages pass an `activeOverride` (e.g. "/shop")
  // so their top-level link stays active.
  useEffect(() => {
    const spy = !activeOverride;
    const spyIds = ["home", "services", "gallery", "contact"];

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      if (!spy) return;

      const probe = window.innerHeight * 0.4;
      let current = spyIds[0];
      for (const id of spyIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= probe) {
          current = id;
        }
      }
      setActiveLink(current);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeOverride]);

  const navLinks: {
    name: string;
    href?: string;
    id: string;
    children?: { name: string; href: string; id: string }[];
  }[] = [
    { name: "Home", href: "/", id: "home" },
    {
      name: "Services",
      href: "#services",
      id: "services",
      children: [
        { name: "All Services", href: "#services", id: "services-all" },
        {
          name: "Sign Boards",
          href: "/services/sign-boards",
          id: "sign-boards",
        },
      ],
    },
    { name: "Shop", href: "/shop", id: "shop" },
    { name: "Gallery", href: "/gallery", id: "gallery" },
    { name: "Contact", href: "#contact", id: "contact" },
  ];

  // Active styling for a sub-nav child — path-based for real pages,
  // section-based for anchor links (e.g. "All Services" lights up
  // while the Services section is in view on the home page).
  const isChildActive = (child: { name: string; href: string; id: string }, parentId: string) =>
    child.href.startsWith("/") ? pathname === child.href : activeLink === parentId;

  // On pages without the home sections (e.g. /shop), section links
  // resolve to the home page so clicking them behaves as on home.
  const isHome = !activeOverride;
  const resolveHref = (href: string) =>
    href.startsWith("/") ? href : isHome ? href : `/${href}`;

  return (
    <>
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
        ? "bg-[#030712]/95 backdrop-blur-xl border-b border-white/5 py-4"
        : "bg-transparent py-6"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo + Title */}
          <motion.a
            href="/"
            whileHover={{ scale: 1.03 }}
            onClick={() => setActiveLink("home")}
            className="flex items-center gap-3"
          >
            <div className="relative w-10 h-10 overflow-hidden">
              <Image
                src="/images/aof-logo.png"
                alt="Art of Frames logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span
              className="text-white font-normal"
              style={{
                fontFamily: navTypography.title.fontFamily,
                fontWeight: navTypography.title.fontWeight,
                fontSize: navTypography.title.fontSize,
                letterSpacing: navTypography.title.letterSpacing,
              }}
            >
              Art of Frames
            </span>
          </motion.a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = activeLink === link.id;
              const linkStyle = {
                fontFamily: isActive
                  ? navTypography.desktop.active.fontFamily
                  : navTypography.desktop.inactive.fontFamily,
                fontWeight: isActive
                  ? navTypography.desktop.active.fontWeight
                  : navTypography.desktop.inactive.fontWeight,
                fontSize: isActive
                  ? navTypography.desktop.active.fontSize
                  : navTypography.desktop.inactive.fontSize,
              };
              const underline = (
                <span
                  className={`absolute -bottom-1 left-0 h-[1px] bg-[#CCA681] transition-all duration-300 ${
                    isActive ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              );

              // Nav items with children render a hover sub-nav panel.
              if (link.children) {
                return (
                  <div
                    key={link.id}
                    className="group relative"
                    onMouseEnter={() => setServicesOpen(true)}
                    onMouseLeave={() => setServicesOpen(false)}
                    onFocus={() => setServicesOpen(true)}
                    onBlur={(e) => {
                      // Keep the panel open while focus moves within it
                      // (trigger → panel links); close once it leaves.
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setServicesOpen(false);
                      }
                    }}
                  >
                    <motion.a
                      href={resolveHref(link.href ?? "#")}
                      onClick={() => setActiveLink(link.id)}
                      whileHover={{ y: -2 }}
                      className={`relative flex items-center gap-1.5 text-sm transition-colors duration-300 ${
                        isActive
                          ? "text-[#CCA681]"
                          : "text-gray-400 hover:text-white"
                      }`}
                      style={linkStyle}
                    >
                      {link.name}
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${
                          servicesOpen ? "rotate-180" : ""
                        } ${
                          isActive ? "text-[#CCA681]" : "text-gray-500"
                        }`}
                      />
                      {underline}
                    </motion.a>

                    {/* Sub-nav panel — a quiet floating card */}
                    <AnimatePresence>
                      {servicesOpen && (
                        <motion.div
                          key="services-panel"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="absolute left-1/2 top-full -translate-x-1/2 pt-4"
                        >
                          <div className="w-52 rounded-xl border border-white/10 bg-[#0a0a14]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                            {link.children.map((child) => {
                              const childActive = isChildActive(child, link.id);
                              return (
                                <Link
                                  key={child.id}
                                  href={resolveHref(child.href)}
                                  onClick={() => setActiveLink(link.id)}
                                  className={`group/item flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                                    childActive
                                      ? "bg-[#CCA681]/10 text-[#CCA681]"
                                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                                  }`}
                                  style={{
                                    fontFamily: "var(--font-display)",
                                    fontWeight: 400,
                                  }}
                                >
                                  {child.name}
                                  <ArrowRight
                                    className={`h-3.5 w-3.5 shrink-0 text-[#CCA681] transition-all duration-200 ${
                                      childActive
                                        ? "translate-x-0 opacity-100"
                                        : "-translate-x-1 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                                    }`}
                                  />
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <motion.a
                  key={link.id}
                  href={resolveHref(link.href ?? "#")}
                  onClick={() => setActiveLink(link.id)}
                  whileHover={{ y: -2 }}
                  className={`relative group text-sm transition-colors duration-300 ${
                    isActive ? "text-[#CCA681]" : "text-gray-400 hover:text-white"
                  }`}
                  style={linkStyle}
                >
                  {link.name}
                  {underline}
                </motion.a>
              );
            })}
          </div>

          {/* Right Icons — Track + Cart */}
          <div className="flex items-center gap-3">
            {/* Track Order — icon + label, sits before the cart */}
            <motion.a
              href="/track-order"
              onClick={() => setActiveLink("track-order")}
              aria-label="Track order"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 h-11 px-3 rounded-full transition-all ${
                activeLink === "track-order"
                  ? "bg-[#CCA681]/10 text-[#CCA681] ring-1 ring-[#CCA681]/40"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Truck className="h-5 w-5" />
              <span
                className="text-white"
                style={{
                  fontFamily: navTypography.desktop.inactive.fontFamily,
                  fontWeight: navTypography.desktop.inactive.fontWeight,
                  fontSize: navTypography.desktop.inactive.fontSize,
                }}
              >
                Track
              </span>
            </motion.a>

            <motion.button
              type="button"
              onClick={toggleCartDrawer}
              aria-label="Open cart"
              aria-haspopup="dialog"
              aria-current={cartActive ? "page" : undefined}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                cartActive
                  ? "bg-[#CCA681]/10 text-[#CCA681] ring-1 ring-[#CCA681]/40"
                  : "hover:bg-white/10"
              }`}
            >
              <ShoppingCart
                className={`h-5 w-5 ${
                  cartActive ? "text-[#CCA681]" : "text-white"
                }`}
              />
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-[#5A1020] rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-lg shadow-[#5A1020]/30"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              className="lg:hidden w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#030712]/98 backdrop-blur-xl border-t border-white/5"
          >
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex flex-col gap-4">
                {navLinks.map((link, index) => {
                  const isActive = activeLink === link.id;
                  const linkStyle = {
                    fontFamily: isActive
                      ? navTypography.mobile.active.fontFamily
                      : navTypography.mobile.inactive.fontFamily,
                    fontWeight: isActive
                      ? navTypography.mobile.active.fontWeight
                      : navTypography.mobile.inactive.fontWeight,
                    fontSize: isActive
                      ? navTypography.mobile.active.fontSize
                      : navTypography.mobile.inactive.fontSize,
                  };

                  // Items with children expand an accordion of sub-links.
                  if (link.children) {
                    return (
                      <div key={link.id}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between border-b border-white/5"
                        >
                          <motion.a
                            href={resolveHref(link.href ?? "#")}
                            onClick={() => {
                              setActiveLink(link.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`py-2 transition-colors ${
                              isActive ? "text-[#CCA681]" : "text-gray-400"
                            }`}
                            style={linkStyle}
                          >
                            {link.name}
                          </motion.a>
                          <button
                            type="button"
                            onClick={() => setServicesSubOpen(!servicesSubOpen)}
                            aria-expanded={servicesSubOpen}
                            aria-label="Toggle services submenu"
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 transition-colors hover:text-[#CCA681]"
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${
                                servicesSubOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </motion.div>
                        <AnimatePresence initial={false}>
                          {servicesSubOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-1 flex flex-col gap-1 border-l border-white/10 py-2 pl-4">
                                {link.children.map((child) => {
                                  const childActive = isChildActive(
                                    child,
                                    link.id
                                  );
                                  return (
                                    <motion.a
                                      key={child.id}
                                      href={resolveHref(child.href)}
                                      onClick={() => {
                                        setActiveLink(link.id);
                                        setMobileMenuOpen(false);
                                      }}
                                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                        childActive
                                          ? "bg-[#CCA681]/10 text-[#CCA681]"
                                          : "text-gray-500 hover:bg-white/5 hover:text-white"
                                      }`}
                                      style={{
                                        fontFamily: "var(--font-display)",
                                        fontWeight: 400,
                                      }}
                                    >
                                      {child.name}
                                    </motion.a>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <motion.a
                      key={link.id}
                      href={resolveHref(link.href ?? "#")}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => {
                        setActiveLink(link.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`py-2 border-b border-white/5 transition-colors ${isActive ? "text-[#CCA681]" : "text-gray-400"
                        }`}
                      style={linkStyle}
                    >
                      {link.name}
                    </motion.a>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>

    {/* Slide-out cart drawer — a SIBLING of the fixed nav (not a child),
        so it escapes the nav's z-50 stacking context and can layer above
        page-level toasts and modals with its own z-index. */}
    <CartDrawer />
    </>
  );
};

export default Navbar;
