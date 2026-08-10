"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, Trash2, FolderPlus, ArrowUp, ArrowDown } from "lucide-react";
import { AButton, ACard, AToggle, PageHeader } from "@/components/admin/ui";
import {
  addCategoryChild,
  addCategoryGroup,
  deleteCategoryChild,
  deleteCategoryGroup,
  getCategories,
  getGalleryCategoryIds,
  getProductCategoryIds,
  moveCategory,
  renameCategoryChild,
  renameCategoryGroup,
  setCategoryActive,
} from "@/lib/admin-db";
import { getLeafIds, type Category } from "@/components/shop/data";

// ============================================================
// CATEGORIES — manage the two-level sidebar tree (groups with
// children). Edits commit to Supabase on every change.
// ============================================================

export default function AdminCategories() {
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [newChild, setNewChild] = useState<Record<string, string>>({});

  const refresh = async () => {
    try {
      setTree(await getCategories());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const cats = await getCategories();
        if (!active) return;
        setTree(cats);
        setError(null);
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load categories");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const addGroup = async () => {
    if (!newGroup.trim()) return;
    try {
      await addCategoryGroup(newGroup.trim());
      setNewGroup("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add group");
    }
  };

  const removeGroup = async (group: Category) => {
    try {
      // Lightweight usage checks — id+category rows only, never the
      // full product/gallery payloads.
      const usedBy = (await getProductCategoryIds()).filter((p) =>
        getLeafIds(group).includes(p.categoryId)
      );
      if (usedBy.length > 0) {
        window.alert(
          `Cannot delete "${group.name}" — ${usedBy.length} product(s) still use it. Move or delete those products first.`
        );
        return;
      }
      // Gallery tiles may sit on the group itself OR any leaf under
      // it (a group-pinned tile lives in the group's path).
      const leaves = new Set(getLeafIds(group));
      const galleryUsed = (await getGalleryCategoryIds()).filter(
        (t) => t.categoryId === group.id || (t.categoryId && leaves.has(t.categoryId))
      );
      if (galleryUsed.length > 0) {
        window.alert(
          `Cannot delete "${group.name}" — ${galleryUsed.length} gallery tile(s) use it or a category under it. Reassign them in the gallery first.`
        );
        return;
      }
      if (!window.confirm(`Delete group "${group.name}" and all its children?`))
        return;
      await deleteCategoryGroup(group.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete group");
    }
  };

  const addChild = async (groupId: string) => {
    const name = (newChild[groupId] ?? "").trim();
    if (!name) return;
    try {
      await addCategoryChild(groupId, name);
      setNewChild((s) => ({ ...s, [groupId]: "" }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add category");
    }
  };

  // Renaming commits to the DB after a short pause (never per
  // keystroke) and patches the tree locally — no full refetch.
  const renameTimers = useRef<Map<string, number>>(new Map());
  const patchName = (id: string, name: string) =>
    setTree((t) =>
      t.map((g) =>
        g.id === id
          ? { ...g, name }
          : {
              ...g,
              children: (g.children ?? []).map((c) =>
                c.id === id ? { ...c, name } : c
              ),
            }
      )
    );
  const queueRename = (id: string, name: string, isGroup: boolean) => {
    patchName(id, name);
    const prev = renameTimers.current.get(id);
    if (prev) window.clearTimeout(prev);
    renameTimers.current.set(
      id,
      window.setTimeout(() => {
        renameTimers.current.delete(id);
        void (isGroup
          ? renameCategoryGroup(id, name)
          : renameCategoryChild(id, name)
        ).catch((e) =>
          setError(e instanceof Error ? e.message : "Failed to rename")
        );
      }, 600)
    );
  };
  // Commit immediately on blur/Enter so the write isn't pending
  // when the input loses focus.
  const flushRename = (id: string, name: string, isGroup: boolean) => {
    const prev = renameTimers.current.get(id);
    if (prev) window.clearTimeout(prev);
    renameTimers.current.delete(id);
    void (isGroup
      ? renameCategoryGroup(id, name)
      : renameCategoryChild(id, name)
    ).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to rename")
    );
  };

  const removeChild = async (childId: string) => {
    try {
      const galleryUsed = (await getGalleryCategoryIds()).filter(
        (t) => t.categoryId === childId
      );
      if (galleryUsed.length > 0) {
        window.alert(
          `Cannot delete — ${galleryUsed.length} gallery tile(s) use it. Reassign them in the gallery first.`
        );
        return;
      }
      await deleteCategoryChild(childId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete category");
    }
  };

  const toggleGroup = async (group: Category) => {
    try {
      await setCategoryActive(group.id, !(group.active ?? true));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update group");
    }
  };

  const toggleChild = async (child: Category) => {
    try {
      await setCategoryActive(child.id, !(child.active ?? true));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update category");
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    try {
      await moveCategory(id, dir);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder categories");
    }
  };

  const groups = tree.filter((c) => c.id !== "all");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Categories"
        subtitle="Groups shown in the shop sidebar with their child categories"
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Add group */}
      <ACard className="mt-6 flex items-center gap-3 p-4">
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addGroup()}
          placeholder="New group name (e.g. Kitchen Items)"
          className="h-10 flex-1 rounded-lg border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/30 outline-none transition-all duration-200 focus:border-[#CCA681]"
        />
        <AButton variant="gold" onClick={() => void addGroup()} disabled={!newGroup.trim()}>
          <FolderPlus size={14} /> Add Group
        </AButton>
      </ACard>

      {/* Groups */}
      <div className="mt-5 flex flex-col gap-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Loading categories…
          </p>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            No groups yet — add your first one above.
          </p>
        ) : (
          groups.map((group) => {
            const groupOn = group.active ?? true;
            return (
            <ACard
              key={group.id}
              className={`p-4 sm:p-5 transition-opacity duration-200 ${
                groupOn ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  value={group.name}
                  onChange={(e) => queueRename(group.id, e.target.value, true)}
                  onBlur={() => flushRename(group.id, group.name, true)}
                  aria-label={`Rename group ${group.name}`}
                  className="h-9 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-base font-medium text-white outline-none transition-all duration-200 focus:border-[#CCA681] hover:border-white/10"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}
                />
                <AToggle
                  title={`${group.name} — visible in shop sidebar`}
                  checked={groupOn}
                  onChange={() => void toggleGroup(group)}
                />
                {!groupOn && (
                  <span className="rounded-full border border-[#E9A23B]/30 bg-[#E9A23B]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#E9A23B]">
                    Hidden
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => void move(group.id, -1)}
                    disabled={groups.indexOf(group) === 0}
                    aria-label={`Move group ${group.name} up`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-[#CCA681] disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => void move(group.id, 1)}
                    disabled={groups.indexOf(group) === groups.length - 1}
                    aria-label={`Move group ${group.name} down`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 hover:text-[#CCA681] disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
                <AButton variant="danger" onClick={() => void removeGroup(group)}>
                  <Trash2 size={13} /> Delete
                </AButton>
              </div>

              {/* Children */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(group.children ?? []).map((child, childIndex) => {
                  const childOn = child.active ?? true;
                  const children = group.children ?? [];
                  return (
                  <span
                    key={child.id}
                    className={`flex items-center gap-1.5 rounded-full border py-1 pl-3 pr-1.5 transition-opacity duration-200 ${
                      childOn
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-white/5 bg-transparent opacity-50"
                    }`}
                  >
                    <input
                      value={child.name}
                      onChange={(e) => queueRename(child.id, e.target.value, false)}
                      onBlur={() => flushRename(child.id, child.name, false)}
                      aria-label={`Rename ${child.name}`}
                      className={`w-24 bg-transparent text-xs outline-none transition-colors focus:text-[#CCA681] ${
                        childOn ? "text-gray-200" : "text-gray-500"
                      }`}
                    />
                    <AToggle
                      title={`${child.name} — visible in shop`}
                      checked={childOn}
                      onChange={() => void toggleChild(child)}
                    />
                    <button
                      onClick={() => void move(child.id, -1)}
                      disabled={childIndex === 0}
                      aria-label={`Move ${child.name} up`}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-[#CCA681] disabled:opacity-30"
                    >
                      <ArrowUp size={10} />
                    </button>
                    <button
                      onClick={() => void move(child.id, 1)}
                      disabled={childIndex === children.length - 1}
                      aria-label={`Move ${child.name} down`}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-[#CCA681] disabled:opacity-30"
                    >
                      <ArrowDown size={10} />
                    </button>
                    <button
                      onClick={() => void removeChild(child.id)}
                      aria-label={`Delete ${child.name}`}
                      className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-300"
                    >
                      <Trash2 size={10} />
                    </button>
                  </span>
                  );
                })}

                {/* Add child */}
                <span className="flex items-center gap-1.5">
                  <input
                    value={newChild[group.id] ?? ""}
                    onChange={(e) =>
                      setNewChild((s) => ({ ...s, [group.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && void addChild(group.id)}
                    aria-label={`Add child to ${group.name}`}
                    placeholder="Add child…"
                    className="h-8 w-28 rounded-full border border-dashed border-white/15 bg-transparent px-3 text-xs text-white placeholder:text-white/25 outline-none transition-all duration-200 focus:border-[#CCA681]"
                  />
                  <button
                    onClick={() => void addChild(group.id)}
                    aria-label={`Add child to ${group.name}`}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 text-gray-400 transition-all hover:border-[#CCA681]/60 hover:text-[#CCA681]"
                  >
                    <Plus size={13} />
                  </button>
                </span>
              </div>
            </ACard>
            );
          })
        )}
      </div>
    </div>
  );
}
