"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  UploadCloud,
  ArrowUp,
  ArrowDown,
  Eye,
} from "lucide-react";
import {
  AButton,
  AInput,
  AToggle,
  ACard,
  PageHeader,
} from "@/components/admin/ui";
import {
  deleteOffer,
  getOffers,
  moveOffer,
  newId,
  saveOffer,
  setOfferActive,
  uploadImage,
} from "@/lib/admin-db";
import type { Offer as AdminOffer } from "@/components/shop/data";

// ============================================================
// OFFERS — the slides of the shop page header carousel.
// Each offer = cover image + title + CTA (label + link).
// ============================================================

const IMAGE_OPTIONS = [
  "/images/hero/hero-1.jpeg",
  "/images/hero/hero-2.jpeg",
  "/images/hero/hero-3.jpeg",
  "/images/lasercut-industry-1-1024x683.jpg",
  "/images/keytags.webp",
  "/images/wallart.webp",
];

interface Draft {
  title: string;
  image: string;
  ctaLabel: string;
  ctaLink: string;
  active: boolean;
}

const emptyDraft = (): Draft => ({
  title: "",
  image: IMAGE_OPTIONS[0],
  ctaLabel: "Shop Now",
  ctaLink: "/shop",
  active: true,
});

const toDraft = (o: AdminOffer): Draft => ({
  title: o.title,
  image: o.image,
  ctaLabel: o.ctaLabel,
  ctaLink: o.ctaLink,
  active: o.active,
});

export default function AdminOffers() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getOffers();
        if (!active) return;
        setOffers(data);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load offers");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    setDraft(emptyDraft());
  };

  const openEdit = (o: AdminOffer) => {
    setEditing(o);
    setDraft(toDraft(o));
  };

  const close = () => {
    setEditing(null);
    setDraft(null);
  };

  const save = async () => {
    if (!draft || !draft.title.trim() || !draft.image.trim()) return;
    setSaving(true);
    try {
      const offer: AdminOffer = {
        id: editing?.id ?? newId(),
        title: draft.title.trim(),
        image: draft.image.trim(),
        ctaLabel: draft.ctaLabel.trim() || "Shop Now",
        ctaLink: draft.ctaLink.trim() || "/shop",
        active: draft.active,
        // Highest existing position + 1 — avoids ties after deletions.
        sortOrder:
          editing?.sortOrder ??
          Math.max(...offers.map((o) => o.sortOrder), 0) + 1,
      };
      await saveOffer(offer);
      // Patch locally — no full refetch after a save.
      setOffers((os) =>
        editing ? os.map((o) => (o.id === offer.id ? offer : o)) : [...os, offer]
      );
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o: AdminOffer) => {
    if (!window.confirm(`Delete offer "${o.title}"?`)) return;
    try {
      await deleteOffer(o.id);
      setOffers((os) => os.filter((x) => x.id !== o.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete offer");
    }
  };

  const toggleActive = (o: AdminOffer) => {
    if (pending.has(o.id)) return;
    setPending((s) => new Set(s).add(o.id));
    void (async () => {
      try {
        await setOfferActive(o.id, !o.active);
        setOffers((os) =>
          os.map((x) => (x.id === o.id ? { ...x, active: !o.active } : x))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update offer");
      } finally {
        setPending((s) => {
          const next = new Set(s);
          next.delete(o.id);
          return next;
        });
      }
    })();
  };

  const move = async (o: AdminOffer, dir: -1 | 1) => {
    try {
      await moveOffer(o.id, dir);
      // Swap locally + renumber so new-offer sortOrder stays unique.
      setOffers((os) => {
        const i = os.findIndex((x) => x.id === o.id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= os.length) return os;
        const next = [...os];
        [next[i], next[j]] = [next[j], next[i]];
        return next.map((x, k) => ({ ...x, sortOrder: k + 1 }));
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder offers");
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!draft || !file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setDraft({ ...draft, image: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const set = (patch: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Offers"
        subtitle="Slides of the shop page header carousel — cover image, title and CTA"
        actions={
          <>
            <Link
              href="/shop"
              target="_blank"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-4 text-xs font-semibold uppercase tracking-widest text-gray-300 transition-all duration-200 hover:border-[#CCA681]/50 hover:text-[#CCA681]"
            >
              <Eye size={13} /> View shop
            </Link>
            <AButton variant="gold" onClick={openNew}>
              <Plus size={14} /> Add Offer
            </AButton>
          </>
        }
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Editor */}
      {draft && (
        <ACard className="mt-6 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2
              className="text-base text-white"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
            >
              {editing ? `Edit — ${editing.title}` : "New Offer"}
            </h2>
            <AButton variant="ghost" onClick={close}>
              <X size={14} /> Close
            </AButton>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <AInput
              label="Title"
              value={draft.title}
              onChange={(v) => set({ title: v })}
              placeholder="Mid-Year Sale — 20% off clocks"
            />
            <AInput
              label="CTA button"
              value={draft.ctaLabel}
              onChange={(v) => set({ ctaLabel: v })}
              placeholder="Shop Clocks"
            />
            <AInput
              label="CTA link"
              value={draft.ctaLink}
              onChange={(v) => set({ ctaLink: v })}
              placeholder="/shop or /shop?category=clocks"
              hint="Full URL (https://…) or a page path"
            />
            <AInput
              label="Cover image path"
              value={draft.image}
              onChange={(v) => set({ image: v })}
              hint="Full path or URL to the cover image"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CCA681]/40 bg-[#CCA681]/5 px-4 text-xs font-semibold text-[#CCA681] transition-all hover:bg-[#CCA681]/10">
              <UploadCloud size={14} />
              {uploading ? "Uploading…" : "Upload cover image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  void handleUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <AToggle
              label="Active — shown in the shop carousel"
              checked={draft.active}
              onChange={(v) => set({ active: v })}
            />
          </div>

          {/* Preview */}
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Preview
            </p>
            <div className="relative aspect-[21/9] max-w-xl overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <Image
                src={draft.image}
                alt={draft.title || "Offer preview"}
                fill
                sizes="576px"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                <p className="text-sm font-medium text-white">
                  {draft.title || "Offer title"}
                </p>
                <span className="rounded-full bg-[#CCA681] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#5A1020]">
                  {draft.ctaLabel || "Shop Now"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 border-t border-white/5 pt-5">
            <AButton variant="outline" onClick={close}>
              Cancel
            </AButton>
            <AButton
              variant="gold"
              onClick={() => void save()}
              disabled={saving || !draft.title.trim() || !draft.image.trim()}
            >
              <Save size={14} /> {saving ? "Saving…" : editing ? "Save Changes" : "Add Offer"}
            </AButton>
          </div>
        </ACard>
      )}

      {/* List */}
      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">Loading offers…</p>
      ) : offers.length === 0 && !draft ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          No offers yet — add your first slide above.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {offers.map((o, i) => (
            <ACard key={o.id} className="group overflow-hidden">
              <div className="relative aspect-[21/9] bg-white/[0.02]">
                <Image
                  src={o.image}
                  alt={o.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"
                />
                {!o.active && (
                  <span className="absolute right-3 top-3 rounded-full border border-[#E9A23B]/30 bg-[#030712]/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#E9A23B] backdrop-blur">
                    Hidden
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm text-white"
                      style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                    >
                      {o.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500">
                      {o.ctaLabel} → {o.ctaLink}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => void move(o, -1)}
                      disabled={i === 0}
                      aria-label="Move offer up"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-[#CCA681] disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => void move(o, 1)}
                      disabled={i === offers.length - 1}
                      aria-label="Move offer down"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-[#CCA681] disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <AToggle
                    title={`${o.title} — ${o.active ? "hide" : "show"} in carousel`}
                    checked={o.active}
                    disabled={pending.has(o.id)}
                    onChange={() => toggleActive(o)}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(o)}
                      aria-label={`Edit ${o.title}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-[#CCA681]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => void remove(o)}
                      aria-label={`Delete ${o.title}`}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </ACard>
          ))}
        </div>
      )}
    </div>
  );
}
