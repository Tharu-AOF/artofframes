"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Headset, MessageCircle, RotateCcw, X } from "lucide-react";
import ChatMessage, {
  type ChatMessageData,
} from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import QuickQuestions from "@/components/chat/QuickQuestions";
import HumanHandoff from "@/components/chat/HumanHandoff";
import type { ProductCard as ProductCardData } from "@/lib/chat/types";

// ============================================================
// CHAT WIDGET — the floating Art of Frames assistant, mounted in
// the root layout so it appears on every public page. Talks to
// POST /api/chat; renders text bubbles, product cards, quick
// questions and the human hand-off form.
// ============================================================

const GREETING: ChatMessageData = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi! 👋 මම නිෂී. අපේ products, prices, delivery ගැන විස්තර දැනගන්න හෝ ඔයාගේ order එක track කරලා විස්තර දෙන්නත් පුළුවන්. ඔයාට මගෙන් දැනගන්න ඕනේ මොනවද?",
};

interface ChatResponse {
  reply?: string;
  products?: ProductCardData[];
  /** Conversation mode of the reply — drives the action chips. */
  mode?: string;
  /** Shop-page CTA (products & prices FAQ). */
  shopLink?: string;
  needsHandoff?: boolean;
  needsWaybill?: boolean;
  trackingLink?: string;
}

const nextId = () =>
  `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const FALLBACK_REPLY =
  "ටිකක් ප්රශ්නයක් වුණා 😅 ආයෙ try කරන්න — නැත්නම් පහළින් අපේ team එකට message එකක් දාන්න.";

// ─── Conversation persistence ────────────────────────────────────────────────
// The chat survives page navigation and reloads by storing the messages
// and session id in the browser (localStorage). A returning customer
// picks up exactly where they left off — same session, same history.

const STORAGE_KEY = "aof-chat-v1";
const MAX_STORED = 50;

interface StoredChat {
  sessionId: string;
  messages: ChatMessageData[];
}

function loadStoredChat(): StoredChat | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChat;
    return parsed &&
      typeof parsed.sessionId === "string" &&
      Array.isArray(parsed.messages)
      ? parsed
      : null;
  } catch {
    return null; // storage unavailable (private mode) — chat just won't persist
  }
}

function saveStoredChat(sessionId: string, messages: ChatMessageData[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId, messages: messages.slice(-MAX_STORED) })
    );
  } catch {
    // ignore — persistence is best-effort
  }
}

/** Cached read so the lazy initializers don't parse storage twice. */
let storedChat: StoredChat | null | undefined;
function getStoredChat(): StoredChat | null {
  if (storedChat === undefined) {
    storedChat = typeof window === "undefined" ? null : loadStoredChat();
  }
  return storedChat;
}

function freshSessionId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `chat-${Date.now()}`;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  // Restored from localStorage (same browser): the conversation survives
  // page navigation and reloads. On the server there is no storage, so a
  // fresh session + greeting are used for the initial HTML only.
  const [sessionId, setSessionId] = useState(
    () => getStoredChat()?.sessionId ?? freshSessionId()
  );
  const [messages, setMessages] = useState<ChatMessageData[]>(() => {
    const stored = getStoredChat();
    return stored && stored.messages.length ? stored.messages : [GREETING];
  });
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist the conversation on every change.
  useEffect(() => {
    saveStoredChat(sessionId, messages);
  }, [sessionId, messages]);

  /** Clear the conversation and start a brand-new chat session. */
  const startNewChat = () => {
    setMessages([GREETING]);
    setShowHandoff(false);
    setSessionId(freshSessionId());
  };

  // A reopened chat panel must show the newest messages, not the top:
  // the panel remounts on open, so jump straight to the bottom.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open]);

  // As new messages arrive, glide down to the latest one.
  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, open]);

  const send = async (text: string) => {
    if (loading) return;
    setMessages((m) => [...m, { id: nextId(), role: "user", content: text }]);
    setLoading(true);
    try {
      const history = messages
        .filter((m) => m.id !== "greeting")
        .slice(-10)
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          content: m.content,
        }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId, history }),
      });
      const data = (await res.json().catch(() => null)) as ChatResponse | null;
      if (!data?.reply) throw new Error("empty reply");
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: "assistant",
          content: data.reply!,
          products: data.products,
          mode: data.mode,
          shopLink: data.shopLink,
          needsHandoff: data.needsHandoff,
          trackingLink: data.trackingLink,
        },
      ]);
      // Never open the hand-off form automatically — the message shows
      // "Chat on WhatsApp / Leave a message" buttons instead.
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "assistant", content: FALLBACK_REPLY },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Launcher (closed state) ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open chat with Art of Frames"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="fixed bottom-24 right-6 z-[70] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#5A1020] text-[#CCA681] shadow-[0_10px_30px_rgba(90,16,32,0.55)] transition-colors duration-200 hover:bg-[#6d1528]"
          >
            <MessageCircle size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat panel (open state) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed bottom-6 right-6 z-[70] flex w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1017] bg-linear-to-b from-[#161a24] to-[#0d1017] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            style={{ height: "min(70vh, 560px)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/5 bg-[#06060f] px-4 py-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5A1020]">
                <MessageCircle size={16} className="text-[#CCA681]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#06060f] bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  Art of Frames
                </p>
                <p className="text-[11px] text-emerald-400">Online</p>
              </div>
              <button
                type="button"
                onClick={startNewChat}
                aria-label="Start new chat"
                title="New chat"
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            {showHandoff ? (
              <HumanHandoff
                sessionId={sessionId}
                onBack={() => setShowHandoff(false)}
                onSubmitted={() => {}}
              />
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-4 py-4"
                  role="log"
                  aria-live="polite"
                  aria-label="Chat messages"
                >
                  {messages.map((m) => (
                    <div key={m.id} className="mb-3 last:mb-0">
                      <ChatMessage
                        message={m}
                        onLeaveMessage={() => setShowHandoff(true)}
                        onAction={send}
                      />
                    </div>
                  ))}
                  {loading && (
                    <div className="mb-3">
                      <TypingIndicator />
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                {messages.length <= 1 && <QuickQuestions onSelect={send} />}

                <ChatInput onSend={send} disabled={loading} />

                <button
                  type="button"
                  onClick={() => setShowHandoff(true)}
                  className="flex cursor-pointer items-center justify-center gap-2 border-t border-white/5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500 transition-colors hover:text-[#CCA681]"
                >
                  <Headset size={13} />
                  Talk to a person
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
