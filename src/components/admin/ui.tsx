"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";

// ============================================================
// ADMIN UI KIT — small branded primitives (dark + gold).
// ============================================================

type ButtonVariant = "gold" | "outline" | "danger" | "ghost";

export function AButton({
  children,
  onClick,
  variant = "outline",
  type = "button",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const styles: Record<ButtonVariant, string> = {
    gold: "bg-[#CCA681] text-[#5A1020] hover:bg-[#e3c79a] hover:shadow-[0_0_25px_rgba(204,166,129,0.35)]",
    outline:
      "border border-white/15 text-gray-200 hover:border-[#CCA681]/60 hover:text-[#CCA681]",
    danger:
      "border border-red-400/30 text-red-300 hover:bg-red-500/10 hover:border-red-400/50",
    ghost: "text-gray-400 hover:text-white",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold uppercase tracking-widest transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.12)]"
      />
      {hint && <span className="mt-1 block text-[11px] text-gray-600">{hint}</span>}
    </label>
  );
}

export function ATextarea({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-lg border border-white/15 bg-black/25 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.12)]"
      />
      {hint && <span className="mt-1 block text-[11px] text-gray-600">{hint}</span>}
    </label>
  );
}

export function ASelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white outline-none transition-all duration-200 focus:border-[#CCA681] [&>option]:bg-[#0a0a14] [&>option]:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Searchable combobox (type-to-filter select) ──────────────
// Drop-in replacement for ASelect when the option list is long
// (e.g. category trees). Same props. Keyboard: type to filter,
// ↑/↓ to move, Enter to pick, Esc / click-outside to close.
export function ASelectSearchable({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  const openMenu = () => {
    setOpen(true);
    setSearch("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pick = (o: { value: string; label: string }) => {
    onChange(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Click outside closes.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Escape closes and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the highlighted option visible while arrow-keying.
  // Manual scrollTop math — never scrolls the page itself.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const el = list?.children[active] as HTMLElement | undefined;
    if (!list || !el) return;
    const top = el.offsetTop - list.offsetTop;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (top + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + el.offsetHeight - list.clientHeight;
    }
  }, [active, open]);

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "Enter" || e.key === "ArrowDown")) {
      e.preventDefault();
      openMenu();
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      // Leave the popover cleanly; default Tab behaviour moves focus.
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[active];
      if (opt) pick(opt);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        onClick={open ? () => setOpen(false) : openMenu}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/25 px-3 text-left text-sm text-white outline-none transition-all duration-200 focus:border-[#CCA681] focus:shadow-[0_0_0_3px_rgba(204,166,129,0.12)]"
      >
        <span className={selected ? "truncate" : "truncate text-white/30"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${
            open ? "rotate-180 text-[#CCA681]" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg border border-white/15 bg-[#0a0a14] shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
          <div className="relative border-b border-white/10">
            <Search
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                // Escape closes just this dropdown — stop it reaching
                // the drawer's Escape handler so it doesn't close the
                // whole panel while picking an option.
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpen(false);
                  triggerRef.current?.focus();
                  return;
                }
                onListKeyDown(e);
              }}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              placeholder="Type to filter…"
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none"
            />
          </div>
          <ul ref={listRef} id={listId} className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-500">
                No matches
              </li>
            ) : (
              filtered.map((o, i) => (
                <li key={o.value}>
                  <button
                    type="button"
                    aria-pressed={o.value === value}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={`w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      i === active
                        ? "bg-[#CCA681]/15 text-[#CCA681]"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────
// Branded on/off switch. `label` is optional — omit it for
// compact list-row toggles (pass one anyway for aria-label).
export function AToggle({
  label,
  title,
  checked,
  onChange,
  disabled,
}: {
  /** Visible label shown next to the switch (also the a11y name) */
  label?: string;
  /** Accessible name when the switch is shown without a visible label */
  title?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label ?? title ?? "Toggle"}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#CCA681]/60 disabled:cursor-not-allowed disabled:opacity-40 ${
          checked ? "bg-[#CCA681]" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </span>
  );
}

export function ACard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1
          className="text-2xl tracking-tight text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}

// ── Slide-over panel (drawer) for edit forms ────────────────
// Right-side overlay with a dimmed backdrop. Closes on backdrop
// click / Escape, locks body scroll, traps Tab inside the panel
// and returns focus on close. The body scrolls; a sticky footer
// carries the form actions. `onClosed` fires after the exit
// animation completes so the parent can clear its draft state
// without the form blanking out mid-slide.
export function ADrawer({
  open,
  onClose,
  onClosed,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Keep the latest onClose in a ref (updated after every render) so
  // the focus/scroll-lock effect below depends only on `open` — an
  // inline onClose would otherwise re-run it — and steal focus — on
  // every keystroke.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // While open: lock body scroll, focus the close button, close on Escape.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [open]);

  // Simple focus trap — Tab cycles within the drawer panel.
  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const focusables = e.currentTarget.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <div className="fixed inset-0 z-[85]">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close editor"
            onClick={() => onCloseRef.current()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={trapFocus}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-[#CCA681]/20 bg-[#06060f]/95 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-xl ${
              size === "md"
                ? "max-w-xl"
                : size === "lg"
                  ? "max-w-2xl"
                  : "max-w-4xl"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold uppercase tracking-widest text-white"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
                >
                  {title}
                </p>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
                )}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => onCloseRef.current()}
                aria-label="Close editor"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 text-gray-300 transition-all duration-300 hover:rotate-90 hover:border-[#CCA681] hover:text-[#CCA681]"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>

            {/* Body — scrolls; the footer stays put below */}
            <div className="thin-scroll flex-1 overflow-y-auto px-5 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-white/10 px-5 py-4">{footer}</div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
