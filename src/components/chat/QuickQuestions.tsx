"use client";

import { Sparkles } from "lucide-react";

// ============================================================
// QUICK QUESTIONS — one-tap starter questions shown when the
// chat opens, guiding customers into useful conversations.
// ============================================================

const QUESTIONS = [
  "මට gift එකක් තෝරගන්න උදව් කරන්න 🎁",
  "Products & prices බලන්න",
  "Delivery ගැන දැනගන්න 🚚",
  "මගේ order එක track කරන්න 📦",
];

export default function QuickQuestions({
  onSelect,
}: {
  onSelect: (text: string) => void;
}) {
  return (
    <div className="px-4 pb-2">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-gray-500">
        <Sparkles size={12} className="text-[#CCA681]" />
        Try asking
      </p>
      <div className="flex flex-wrap gap-2">
        {QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            className="cursor-pointer rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-1.5 text-xs text-gray-300 transition-colors duration-200 hover:border-[#CCA681]/50 hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
