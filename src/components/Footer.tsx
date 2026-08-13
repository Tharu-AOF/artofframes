import React from "react";
import Image from "next/image";

// ============================================================
// FOOTER — minimal closing bar: brand, socials, quick links,
// copyright.
// ============================================================

// lucide-react no longer ships brand icons, so these are inline
// SVG paths (stroke/fill = currentColor so hover tints work).

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// Swap these with the real business handles when available.
const socials = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/",
    Icon: InstagramIcon,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/",
    Icon: FacebookIcon,
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/94750350109",
    Icon: WhatsAppIcon,
  },
];

const quickLinks = [
  { name: "Home", href: "#home" },
  { name: "Services", href: "#services" },
  { name: "Sign Boards", href: "/services/sign-boards" },
  { name: "Shop", href: "/shop" },
  { name: "Partners", href: "/partner-program" },
  { name: "Gallery", href: "#gallery" },
  { name: "Track Order", href: "/track-order" },
  { name: "Contact", href: "#contact" },
];

const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-[#030712]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between md:gap-4 lg:px-8">
        {/* Brand */}
        <a
          href="#home"
          className="flex items-center gap-3 transition-opacity duration-300 hover:opacity-80"
        >
          <div className="relative h-9 w-9 overflow-hidden">
            <Image
              src="/images/aof-logo.png"
              alt="Art of Frames logo"
              fill
              className="object-contain"
            />
          </div>
          <span
            className="text-lg tracking-wide text-white"
            style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
          >
            Art of Frames
          </span>
        </a>

        {/* Socials */}
        <div className="flex items-center gap-2.5">
          {socials.map((social) => {
            const Icon = social.Icon;
            return (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-gray-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#CCA681]/50 hover:bg-white/5 hover:text-[#CCA681]"
              >
                <Icon />
              </a>
            );
          })}
        </div>

        {/* Quick links */}
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        >
          {quickLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-xs uppercase tracking-widest text-gray-500 transition-colors duration-300 hover:text-[#CCA681]"
            >
              {link.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/5">
        <p className="mx-auto flex max-w-7xl flex-col items-center gap-1.5 px-6 py-4 text-center text-[11px] tracking-wide text-gray-600 sm:flex-row sm:justify-between md:text-left lg:px-8">
          <span>
            © {new Date().getFullYear()} Art of Frames. All rights reserved.
            Crafted with precision.
          </span>
          <span>
            Powered by{" "}
            <a
              href="https://bizravana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-400 transition-colors duration-300 hover:text-[#CCA681]"
            >
              BizRavana
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
