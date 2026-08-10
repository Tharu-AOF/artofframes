"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";

// ============================================================
// CHAT INPUT — single-line message field + send button.
// Enter submits; the button disables while the bot is replying.
// ============================================================

export default function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="flex items-center gap-2 border-t border-white/5 p-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Type your message…"
        aria-label="Chat message"
        maxLength={500}
        className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white placeholder:text-gray-600 focus:border-[#CCA681]/60 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#5A1020] text-[#CCA681] transition-all duration-200 hover:bg-[#6d1528] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SendHorizonal size={18} />
      </button>
    </div>
  );
}
