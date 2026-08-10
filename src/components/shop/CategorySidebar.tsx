"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getCategoryPath, getLeafIds, type Category } from "@/components/shop/data";

// ============================================================
// CATEGORY SIDEBAR — the shop's navigation tree. The chevron on a
// group expands/collapses its subcategories (independent of
// filtering); clicking a group's name filters to everything beneath
// it, and leaves filter to a single line. Selecting a collapsed
// group auto-expands it so the active item stays visible.
//
// Empty categories (0 pieces) are hidden to keep the tree focused;
// the currently-selected category — and its ancestor groups — stay
// visible even when empty so the active choice never vanishes.
//
// Used in two places: the sticky desktop column and the mobile
// drawer — each gets its own instance.
// ============================================================

interface CategorySidebarProps {
  selected: string;
  onSelect: (id: string) => void;
  /** Count per category id (groups aggregate their children). */
  counts: Record<string, number>;
  /** The category tree (fetched from Supabase). */
  tree: Category[];
  /** Word for the total in the header — "pieces" (shop) or "photos" (gallery). */
  noun?: string;
}

const CategorySidebar = ({
  selected,
  onSelect,
  counts,
  tree,
  noun = "pieces",
}: CategorySidebarProps) => {
  // Groups start expanded so the full range of categories is visible.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["hotel-items", "wall-arts"])
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Category ids on the selected item's path — these stay visible
  // even with zero counts so the active choice never disappears.
  const activePath = useMemo(
    () =>
      selected === "all"
        ? new Set<string>()
        : new Set(getCategoryPath(selected, tree).map((c) => c.id)),
    [selected, tree]
  );

  // When a leaf is picked from outside the tree, make sure its
  // parent group is expanded so the selection is visible.
  const ensureVisible = (id: string) => {
    setExpanded((prev) => {
      if (id === "all" || prev.has(id)) return prev;
      const path = getCategoryPath(id, tree);
      if (!path.length) return prev;
      const next = new Set(prev);
      for (const c of path) {
        if (c.children) next.add(c.id);
      }
      return next;
    });
  };

  const handleSelect = (id: string) => {
    ensureVisible(id);
    onSelect(id);
  };

  const containsSelected = (cat: Category) =>
    cat.children !== undefined &&
    selected !== "all" &&
    getLeafIds(cat).includes(selected);

  const renderTree = (cats: Category[], depth: number) => (
    <>
      {cats
        .filter(
          (cat) =>
            cat.id === "all" ||
            (counts[cat.id] ?? 0) > 0 ||
            activePath.has(cat.id)
        )
        .map((cat) => {
        const isGroup = !!cat.children?.length;
        const isOpen = expanded.has(cat.id);
        const isSelected = selected === cat.id;
        const inActiveLine = isSelected || containsSelected(cat);
        const count = counts[cat.id] ?? 0;

          return (
            <div key={cat.id}>
              <div
                className={`group relative flex h-10 w-full items-center gap-1.5 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? "bg-[#CCA681]/12 shadow-[inset_0_0_0_1px_rgba(204,166,129,0.25)]"
                    : "hover:bg-white/5"
                }`}
                style={{ paddingLeft: depth === 0 ? 10 : 8 + depth * 14 }}
              >
              {/* Active left accent */}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[#CCA681] transition-all duration-300 ${
                  inActiveLine ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Chevron — expand/collapse only, never filters */}
              {isGroup ? (
                <button
                  type="button"
                  onClick={() => toggle(cat.id)}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.name}`}
                  aria-expanded={isOpen}
                  className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                >
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={`transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#CCA681]" : ""
                    }`}
                  />
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                </span>
              )}

              {/* Label — filters; selecting a collapsed group expands it */}
              <button
                type="button"
                onClick={() => handleSelect(cat.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`min-w-0 flex-1 truncate text-left text-sm transition-colors duration-200 ${
                  inActiveLine
                    ? "text-[#CCA681]"
                    : "text-gray-300 group-hover:text-white"
                }`}
                style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
              >
                {cat.name}
              </button>

              <span
                className={`ml-auto shrink-0 pr-2 text-[11px] tabular-nums tracking-wide ${
                  count > 0 ? "text-[#CCA681]/70" : "text-gray-600"
                }`}
              >
                {count}
              </span>
            </div>

            {isGroup && isOpen && (
              <div className="ml-[13px] border-l border-white/10 pl-1">
                {renderTree(cat.children!, depth + 1)}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="card-shimmer relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-3 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Categories
        </p>
        <p className="text-[10px] uppercase tracking-widest text-[#CCA681]">
          {counts.all ?? 0} {noun}
        </p>
      </div>
      <div className="border-t border-white/5 pt-2">
        {renderTree(tree, 0)}
      </div>
    </div>
  );
};

export default CategorySidebar;
