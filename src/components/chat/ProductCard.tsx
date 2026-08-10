"use client";

import Image from "next/image";
import type { ProductCard as ProductCardData } from "@/lib/chat/types";

// ============================================================
// PRODUCT CARD — a compact recommended-product card rendered in
// the chat when the bot returns product hits. Links straight to
// the product on the shop page (?product=<id> opens the modal).
// ============================================================

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <a
      href={product.url}
      className="group flex w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#171a21] transition-colors duration-200 hover:border-[#CCA681]/50"
    >
      <div className="relative h-20 w-full overflow-hidden bg-black/30">
        <Image
          src={product.image}
          alt={product.name}
          width={148}
          height={80}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-white">
          {product.name}
        </p>
        <p className="mt-auto text-[11px] font-bold text-[#CCA681]">
          {product.price}
        </p>
      </div>
    </a>
  );
}
