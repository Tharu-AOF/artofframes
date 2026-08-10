"use client";

// ============================================================
// TYPING INDICATOR — three bouncing dots shown while the bot is
// "thinking". The bounce keyframes live in globals.css
// (.typing-dot); dots are staggered with animation-delay.
// ============================================================

export default function TypingIndicator() {
  return (
    <div
      aria-label="Typing"
      className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/10 bg-[#1e222a] px-4 py-3"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-2 w-2 rounded-full bg-[#CCA681]"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}
