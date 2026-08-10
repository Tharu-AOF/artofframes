"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Tag } from "lucide-react";
import {
  AButton,
  AInput,
  ASelect,
  ASelectSearchable,
  AToggle,
  ACard,
  PageHeader,
} from "@/components/admin/ui";
import {
  deleteDiscount,
  getCategories,
  getDiscounts,
  getProductSummaries,
  newId,
  saveDiscount,
  setDiscountActive,
  type ProductSummary,
} from "@/lib/admin-db";
import {
  discountLabel,
  discountStatus,
  getCategoryPathName,
  type Category,
  type DiscountCampaign,
  type DiscountStatus,
} from "@/components/shop/data";

// ============================================================
// DISCOUNTS — scheduled sales on a single product or a whole
// category. Live = active AND within the start/end window.
// ============================================================

interface Draft {
  target: string; // "product:<uuid>" | "category:<slug>"
  targetType: "product" | "category";
  type: "percent" | "flat";
  value: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const emptyDraft = (): Draft => ({
  target: "",
  targetType: "product",
  type: "percent",
  value: "",
  startsAt: "",
  endsAt: "",
  active: true,
});

const toDraft = (d: DiscountCampaign): Draft => ({
  target: `${d.targetType}:${d.targetId}`,
  targetType: d.targetType,
  type: d.type,
  value: String(d.value),
  startsAt: d.startsAt ?? "",
  endsAt: d.endsAt ?? "",
  active: d.active,
});

const toCampaign = (d: Draft, editing?: DiscountCampaign): DiscountCampaign => ({
  id: editing?.id ?? newId(),
  targetType: d.targetType,
  targetId: d.target.split(":").slice(1).join(":") ?? "",
  type: d.type,
  value: parseFloat(d.value) || 0,
  startsAt: d.startsAt || null,
  endsAt: d.endsAt || null,
  active: d.active,
});

const STATUS_STYLES: Record<DiscountStatus, string> = {
  live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-400",
  expired: "border-white/15 bg-white/5 text-gray-500",
  paused: "border-[#E9A23B]/30 bg-[#E9A23B]/10 text-[#E9A23B]",
};

export default function AdminDiscounts() {
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DiscountStatus>("all");
  const [editing, setEditing] = useState<DiscountCampaign | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [discs, prods, cats] = await Promise.all([
          getDiscounts(),
          getProductSummaries(),
          getCategories(),
        ]);
        if (!active) return;
        setCampaigns(discs);
        setProducts(prods);
        setCategories(cats);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load discounts");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ── Target names for the list + searchable pickers ──

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: `product:${p.id}`,
        label: `${p.name} · ${getCategoryPathName(p.categoryId, categories)}`,
      })),
    [products, categories]
  );

  const categoryOptions = useMemo(() => {
    const walk = (tree: Category[]): { value: string; label: string }[] =>
      tree.flatMap((c) =>
        c.id === "all"
          ? []
          : [
              {
                value: `category:${c.id}`,
                label: getCategoryPathName(c.id, categories),
              },
              ...(c.children ? walk(c.children) : []),
            ]
      );
    return walk(categories);
  }, [categories]);

  const targetLabel = (d: DiscountCampaign): string => {
    if (d.targetType === "product") {
      const p = products.find((x) => x.id === d.targetId);
      return p ? `${p.name} · ${getCategoryPathName(p.categoryId, categories)}` : d.targetId;
    }
    const name = getCategoryPathName(d.targetId, categories);
    return name ? name : d.targetId;
  };

  const filtered = campaigns.filter(
    (c) => statusFilter === "all" || discountStatus(c) === statusFilter
  );

  // ── Actions ──

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
  };

  const openEdit = (d: DiscountCampaign) => {
    setEditing(d);
    setDraft(toDraft(d));
  };

  const close = () => {
    setEditing(null);
    setDraft(null);
  };

  const save = async () => {
    if (!draft || !draft.target) return;
    const value = parseFloat(draft.value);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a discount value greater than 0.");
      return;
    }
    if (draft.type === "percent" && value > 100) {
      setError("A percentage discount can't exceed 100%.");
      return;
    }
    if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) {
      setError("The end date can't be before the start date.");
      return;
    }
    setSaving(true);
    try {
      const campaign = toCampaign(draft, editing ?? undefined);
      await saveDiscount(campaign);
      // Patch locally — no full refetch after a save.
      setCampaigns((cs) =>
        editing
          ? cs.map((c) => (c.id === campaign.id ? campaign : c))
          : [campaign, ...cs]
      );
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save discount");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: DiscountCampaign) => {
    if (!window.confirm(`Delete this ${discountLabel(d)} on "${targetLabel(d)}"?`))
      return;
    try {
      await deleteDiscount(d.id);
      setCampaigns((cs) => cs.filter((c) => c.id !== d.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete discount");
    }
  };

  const toggleActive = (d: DiscountCampaign) => {
    if (pending.has(d.id)) return;
    setPending((s) => new Set(s).add(d.id));
    void (async () => {
      try {
        await setDiscountActive(d.id, !d.active);
        setCampaigns((cs) =>
          cs.map((c) => (c.id === d.id ? { ...c, active: !d.active } : c))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update discount");
      } finally {
        setPending((s) => {
          const next = new Set(s);
          next.delete(d.id);
          return next;
        });
      }
    })();
  };

  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Discounts"
        subtitle="Scheduled sales on products or whole categories"
        actions={
          <AButton variant="gold" onClick={openNew}>
            <Plus size={14} /> Add Campaign
          </AButton>
        }
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Status filter */}
      <div className="mt-6 flex items-end justify-end">
        <ASelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as "all" | DiscountStatus)}
          options={[
            { value: "all", label: "All campaigns" },
            { value: "live", label: "Live" },
            { value: "scheduled", label: "Scheduled" },
            { value: "paused", label: "Paused" },
            { value: "expired", label: "Expired" },
          ]}
        />
      </div>

      {/* Editor */}
      {draft && (
        <ACard className="mt-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2
              className="text-base text-white"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              {editing ? `Edit — ${discountLabel(editing)}` : "New Campaign"}
            </h2>
            <AButton variant="ghost" onClick={close}>
              <X size={14} /> Close
            </AButton>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ASelect
              label="Target type"
              value={draft.targetType}
              onChange={(v) =>
                set({ targetType: v as "product" | "category", target: "" })
              }
              options={[
                { value: "product", label: "Single product" },
                { value: "category", label: "Whole category" },
              ]}
            />
            <div className="sm:col-span-2">
              <ASelectSearchable
                label={draft.targetType === "product" ? "Product" : "Category"}
                value={draft.target}
                onChange={(v) => set({ target: v })}
                options={
                  draft.targetType === "product" ? productOptions : categoryOptions
                }
                placeholder="Search to pick a target…"
              />
            </div>
            <ASelect
              label="Discount type"
              value={draft.type}
              onChange={(v) => set({ type: v as "percent" | "flat" })}
              options={[
                { value: "percent", label: "Percentage (%)" },
                { value: "flat", label: "Flat amount (Rs.)" },
              ]}
            />
            <AInput
              label={draft.type === "percent" ? "Value (%)" : "Value (Rs.)"}
              value={draft.value}
              onChange={(v) => set({ value: v })}
              type="number"
              placeholder={draft.type === "percent" ? "10" : "500"}
            />
            <div className="grid grid-cols-2 gap-4">
              <AInput
                label="Starts"
                type="date"
                value={draft.startsAt}
                onChange={(v) => set({ startsAt: v })}
              />
              <AInput
                label="Ends"
                type="date"
                value={draft.endsAt}
                onChange={(v) => set({ endsAt: v })}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3.5">
            <AToggle
              label="Active"
              checked={draft.active}
              onChange={(v) => set({ active: v })}
            />
            <span className="text-[11px] text-gray-500">
              Leave dates empty for an open-ended sale that starts now.
            </span>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 border-t border-white/5 pt-5">
            <AButton variant="outline" onClick={close}>
              Cancel
            </AButton>
            <AButton
              variant="gold"
              onClick={() => void save()}
              disabled={saving || !draft.target || !draft.value.trim()}
            >
              <Save size={14} /> {saving ? "Saving…" : editing ? "Save Changes" : "Add Campaign"}
            </AButton>
          </div>
        </ACard>
      )}

      {/* List */}
      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          Loading campaigns…
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          {campaigns.length === 0
            ? "No campaigns yet — create your first sale above."
            : "No campaigns match this status."}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {filtered.map((c) => {
            const status = discountStatus(c);
            return (
              <ACard key={c.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#CCA681]/12 text-[#CCA681]">
                    <Tag size={16} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {targetLabel(c)}
                    </p>
                    <p className="text-[11px] uppercase tracking-widest text-gray-500">
                      {c.targetType === "product" ? "Product" : "Category"}
                      {c.startsAt || c.endsAt
                        ? ` · ${c.startsAt ?? "now"} → ${c.endsAt ?? "no end"}`
                        : " · open-ended"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[#CCA681]/30 bg-[#CCA681]/10 px-3 py-1 text-xs font-bold text-[#CCA681]">
                    {discountLabel(c)}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[status]}`}
                  >
                    {status}
                  </span>
                  <AToggle
                    title={`${targetLabel(c)} — ${c.active ? "pause" : "activate"}`}
                    checked={c.active}
                    disabled={pending.has(c.id)}
                    onChange={() => toggleActive(c)}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(c)}
                      aria-label={`Edit discount on ${targetLabel(c)}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-[#CCA681]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => void remove(c)}
                      aria-label={`Delete discount on ${targetLabel(c)}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </ACard>
            );
          })}
        </div>
      )}
    </div>
  );
}
