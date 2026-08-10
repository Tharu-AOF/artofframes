"use client";

import { Fragment, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  PenLine,
  RefreshCw,
  Scale,
  ShoppingBag,
  Truck,
} from "lucide-react";
import ProductCard from "@/components/chat/ProductCard";
import { WHATSAPP_NUMBER } from "@/components/shop/data";
import type { ProductCard as ProductCardData } from "@/lib/chat/types";

// ============================================================
// CHAT MESSAGE — one bubble in the conversation. User messages
// sit right in the brand wine color; bot messages sit left in a
// subtle dark card. Optional product cards render beneath a bot
// reply as a scrollable row. When the bot is busy or can't answer
// (needsHandoff), action buttons appear instead of an automatic
// form: chat on WhatsApp, or leave a message.
// ============================================================

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ProductCardData[];
  /** Conversation mode of the reply — drives the contextual action chips. */
  mode?: string;
  /** When set, shows a "Browse shop" button linking to this page. */
  shopLink?: string;
  /** True when the bot couldn't answer — shows WhatsApp/leave-message actions. */
  needsHandoff?: boolean;
  /** When set, shows a "Track full journey" button linking to this page. */
  trackingLink?: string;
}

// ─── Rich formatting ────────────────────────────────────────────────────────
// Replies are rendered as short paragraphs, bullet/numbered lists, bold
// product names and gold-highlighted rupee prices — so long answers are
// scannable instead of one wall of text.

/** Rupee amounts ("Rs. 1,590", "රු 500", "රු. 3,450") get the brand-gold highlight. */
const PRICE_RE = /(Rs\.\s?[\d,]+|රු\.?\s?[\d,]+)/;

function highlightPrices(text: string): ReactNode[] {
  return text.split(PRICE_RE).map((seg, i) =>
    PRICE_RE.test(seg) ? (
      <span key={i} className="font-semibold text-[#CCA681]">
        {seg}
      </span>
    ) : (
      <Fragment key={i}>{seg}</Fragment>
    )
  );
}

/** Inline: **bold** names/emphasis + gold rupee amounts. */
function renderInline(text: string): ReactNode {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => {
        const nodes = highlightPrices(part);
        return i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-white">
            {nodes}
          </strong>
        ) : (
          <Fragment key={i}>{nodes}</Fragment>
        );
      })}
    </>
  );
}

/** Blocks: paragraphs, bullet lists ("- ", "• ") and numbered lists ("1. "). */
function renderBlocks(text: string): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let para: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    blocks.push(
      <p key={`p${key++}`} className="mb-1.5 last:mb-0">
        {renderInline(para.join(" "))}
      </p>
    );
    para = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const cls =
      "mb-1.5 space-y-0.5 pl-5 last:mb-0 marker:font-semibold marker:text-[#CCA681]";
    blocks.push(
      listType === "ol" ? (
        <ol key={`l${key++}`} className={`${cls} list-decimal`}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={`l${key++}`} className={`${cls} list-disc`}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      )
    );
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const ulMatch = line.match(/^[-•]\s+(.+)$/);
    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (ulMatch || olMatch) {
      flushPara();
      const type = olMatch ? "ol" : "ul";
      if (listType !== type) {
        flushList();
        listType = type;
      }
      listItems.push((ulMatch ?? olMatch)![1].trim());
      continue;
    }
    flushList();
    if (!line) {
      flushPara();
      continue;
    }
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export default function ChatMessage({
  message,
  onLeaveMessage,
  onAction,
}: {
  message: ChatMessageData;
  onLeaveMessage?: () => void;
  /** Sends a follow-up prompt ("more options", "compare") back to the bot. */
  onAction?: (text: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm bg-[#5A1020] text-[#e8c9a1]"
              : "rounded-bl-sm border border-white/10 bg-[#1e222a] text-gray-100"
          }`}
        >
          {isUser ? renderInline(message.content) : renderBlocks(message.content)}
        </div>
        {message.products && message.products.length > 0 && (
          <>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {message.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <a
              href={message.products[0].relatedUrl}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#CCA681]/35 bg-[#CCA681]/10 px-3 py-2 text-xs font-semibold text-[#e8c9a1] transition-colors hover:bg-[#CCA681]/20"
            >
              {message.products[0].relatedLabel}
              <ArrowRight size={14} />
            </a>
            {/* Mode-aware follow-up chips: keep the conversation moving
                without any ordering pressure. */}
            {onAction && message.mode && ["discover", "detail", "compare"].includes(message.mode) && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAction("අනිත් options තියෙනවද?")}
                  className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#CCA681]/50 hover:text-white"
                >
                  <RefreshCw size={13} className="text-[#CCA681]" />
                  More options
                </button>
                {message.products.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => onAction("මේ දෙකෙන් හොඳ එක?")}
                    className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#CCA681]/50 hover:text-white"
                  >
                    <Scale size={13} className="text-[#CCA681]" />
                    Compare
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {message.shopLink && (
          <div className="mt-2">
            <a
              href={message.shopLink}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#CCA681]/40 bg-[#CCA681]/10 px-3.5 py-2 text-xs font-semibold text-[#e8c9a1] transition-colors duration-200 hover:bg-[#CCA681]/20"
            >
              <ShoppingBag size={14} />
              Browse shop
            </a>
          </div>
        )}
        {message.trackingLink && (
          <div className="mt-2">
            <a
              href={message.trackingLink}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#5A1020]/70 px-3.5 py-2 text-xs font-semibold text-[#CCA681] transition-colors duration-200 hover:bg-[#5A1020]"
            >
              <Truck size={14} />
              Track full journey
            </a>
          </div>
        )}
        {message.needsHandoff && (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-[#1fa855]/15 px-3 py-2 text-xs font-semibold text-[#4ade80] transition-colors hover:bg-[#1fa855]/25"
              >
                <MessageCircle size={14} />
                Chat on WhatsApp
              </a>
              <button
                type="button"
                onClick={onLeaveMessage}
                className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/10"
              >
                <PenLine size={14} />
                Leave a message
              </button>
            </div>

            <div className="border-t border-white/8 pt-3">
              <p className="text-xs leading-relaxed text-gray-300">
                නැත්තම් ඔයාට ඕනෙ item එක shop page එකෙන් තෝරගන්න.
              </p>
              <a
                href="/shop"
                className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#CCA681]/40 bg-[#CCA681]/10 px-3 py-2 text-xs font-semibold text-[#e8c9a1] transition-colors hover:bg-[#CCA681]/20"
              >
                <ShoppingBag size={14} />
                Browse shop
              </a>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
