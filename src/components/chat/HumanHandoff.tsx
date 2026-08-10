"use client";

import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";

// ============================================================
// HUMAN HANDOFF — "talk to a person" form. Saves the request to
// the chat_handoffs table via the server route so the owner can
// reply. Explicitly warns against sensitive info in chat.
// ============================================================

export default function HumanHandoff({
  sessionId,
  onBack,
  onSubmitted,
}: {
  sessionId: string;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name: name.trim(),
          contact: contact.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setDone(true);
      onSubmitted();
    } catch {
      setError("Message එක save කරන්න බැරි උනා. ආයෙ try කරන්න.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <p className="text-2xl">✅</p>
        <p className="text-sm leading-relaxed text-gray-200">
          ඔබේ message එක අපේ team එකට ගියා! 😊 අපි ඉක්මනින්ම reply කරන්නම්.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-2 cursor-pointer text-xs font-semibold uppercase tracking-widest text-[#CCA681] hover:text-white"
        >
          Back to chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chat"
          className="cursor-pointer text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-sm font-semibold text-white">Talk to a person</p>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#CCA681]/60 focus:outline-none"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
              Email / WhatsApp
            </span>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={200}
              className="h-9 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white placeholder:text-gray-600 focus:border-[#CCA681]/60 focus:outline-none"
            />
          </label>
        </div>
        <label>
          <span className="mb-1 block text-[11px] uppercase tracking-widest text-gray-500">
            Message *
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={4}
            required
            className="w-full resize-none rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#CCA681]/60 focus:outline-none"
            placeholder="How can we help?"
          />
        </label>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="mt-auto flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#5A1020] text-xs font-bold uppercase tracking-widest text-[#CCA681] transition-all duration-200 hover:bg-[#6d1528] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-600">
          <ShieldCheck size={13} className="mt-0.5 shrink-0" />
          Never share card numbers, passwords or NIC numbers in chat — payments
          happen through the official process only.
        </p>
      </form>
    </div>
  );
}
