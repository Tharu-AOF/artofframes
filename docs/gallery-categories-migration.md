# Gallery Categories Migration

Replacing the gallery's free-form **tag** system with the shop's **category** system — one
category tree for products and gallery alike.

## Why

- **Products** already use a two-level category tree (`categories` table, leaf `category_id`).
  The shop sidebar (`CategorySidebar`) renders it with counts, expand/collapse groups, sticky
  desktop column + mobile drawer, and `?category=` URL deep links.
- **Gallery** had a separate, hand-rolled tag system: a managed list (`gallery_tags`) plus
  `tag`/`tags` columns on `gallery_items`. The `/gallery` page built its own flat tag
  sidebar/chips, and the admin Gallery page had its own tag manager.

Target: **one category system** — gallery tiles get a `category_id` from the same `categories`
table, the tags system is deleted, the product form can push a photo into the gallery, and
`/gallery` uses the exact same `CategorySidebar` as the shop.

## Decisions

| # | Decision | Resolution |
|---|----------|------------|
| D1 | May tiles reference a group or only a leaf? | **Either — and a tile can live under several categories.** Products stay leaf-only; a tile may sit on a group *or* leaf, or many at once. `gallery_items.category_id` stores the PRIMARY category (first pick — drives the home page caption) while `gallery_item_categories` holds the full set. Filter/count logic walks each tile's category path, so "Wall Arts" photos map naturally to the wall-arts group. |
| D2 | Old tag → category mapping | Backfill by **normalized name**: explicit alias table for irregulars (Keytags→keytag, Table Numbers→table-number, …) plus slugified-name matching. Unmatched tags ("In Action", "Silhouette") → uncategorized (`category_id` NULL), surfaced as a warning chip in admin until assigned. New tiles require a category. |
| D3 | "Add to Gallery also" semantics | **Linked tile** — nullable `product_id` (unique FK → products, cascade delete) on `gallery_items`. Toggle on upserts one tile mirroring the product; toggle off removes it. Re-saving is idempotent; deleting a product cleans up its tile. |

### D2 mapping table

```js
// scripts/migrate-gallery-categories.mjs
const TAG_ALIASES = {
  keytags: "keytag",
  "table-numbers": "table-number",
  "serviette-holders": "serviette-holder",
  coasters: "coaster",
  "hotel-restaurant": "hotel-items",
  "open-close": "open-close-welcome",
};
// Everything else resolves by slugify(tag) === slugify(category.name),
// e.g. "Sign Boards" → sign-boards, "Wall Arts" → wall-arts,
// "Mommy Frames" → mommy-frames, "Love Gifts" → love-gifts,
// "Baby Frames" → baby-frames, "Door Signs" → door-signs,
// "Restroom" → restroom, "Clocks" → clocks.
// No match ("In Action", "Silhouette") → uncategorized.
```

## Schema

`supabase/schema.sql` — final shape. A tile can live under SEVERAL
categories: `category_id` is the PRIMARY one (first selection — drives
the home page caption); the full set lives in `gallery_item_categories`.

```sql
create table if not exists gallery_items (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category_id  text references categories (id),   -- PRIMARY category; group or leaf; NULL = uncategorized
  image_url    text not null,
  color        text not null default '#CCA681',
  span         text not null default '',
  show_on_home boolean not null default false,   -- appears on the landing page
  sort_order   integer not null default 0,
  product_id   uuid unique references products (id) on delete cascade
);

-- Full category set (primary included) — admin multi-select and
-- /gallery filtering read this; schema.sql backfills it from
-- category_id on every apply (idempotent).
create table if not exists gallery_item_categories (
  gallery_item_id uuid not null references gallery_items (id) on delete cascade,
  category_id     text not null references categories (id) on delete cascade,
  primary key (gallery_item_id, category_id)
);
```

- `gallery_tags` table and all its RLS policies are removed.
- The legacy `tag` / `tags` columns are dropped **by the migration script** (after backfill).
- `gallery_item_categories` gets the same RLS treatment as every table (public read + admin write).

## Phases

| Phase | What changed |
|-------|--------------|
| **1 — Schema + migration** | `supabase/schema.sql`, new `scripts/migrate-gallery-categories.mjs`, `supabase/seed.sql`, `scripts/seed-gallery.mjs`, `scripts/add-gallery-batch.mjs` |
| **2 — Admin gallery is category-driven** | `src/lib/admin-db.ts`, `src/app/admin/gallery/page.tsx`, `src/app/admin/categories/page.tsx` |
| **3 — "Add to Gallery also"** | `src/app/admin/products/page.tsx`, `src/lib/admin-db.ts` (`syncProductGalleryTile`), `src/components/shop/data.ts` (`inGallery`) |
| **4 — /gallery gets the shop sidebar** | `src/lib/shop-db.ts` (`getShopCategories`, `categoryId` tiles), `src/app/gallery/page.tsx`, `src/components/gallery/GalleryCollection.tsx`, `src/components/shop/CategorySidebar.tsx` (`noun` prop), `src/app/page.tsx`, `src/components/Gallery.tsx` |
| **5 — Cleanup + verification** | Dead tag code swept; `tsc --noEmit`, ESLint, `next build` all green |

### Behaviour notes

- **Admin gallery**: multi-select category picker (groups *and* leaves, path-labelled; first
  pick = primary), category filter with counts, per-tile category chips (with an "N cats" badge
  when a tile lives under several), amber "No category" warning chip (+ summary banner), new
  tiles require at least one category. (An earlier plan mentioned a thumbnail quick-select
  popover — the shipped UI does this with chips + the edit drawer instead.)
- **Category delete guards**: groups/children in use by gallery tiles (directly or via a
  descendant) are blocked with a clear message.
- **Product form**: "Add to Gallery also" toggle mirrors the product (first image, name,
  category, tint) into one linked tile; hint text explains it; turning it off or deleting the
  product removes the tile.
- **/gallery**: same `CategorySidebar` as the shop — sticky desktop, mobile drawer,
  `?category=` deep links validated against the tree, counts per category path, group =
  everything under it. Uncategorized tiles appear only under "All". Masonry grid + lightbox
  unchanged; captions show the category path name.
- **Home "Our Craft" bento**: caption is the tile's category path name (uncategorized →
  "From the Studio"); the mixed picker caps at **max 2 per category** (was per tag).

## Deployment runbook (important)

**Order matters — do NOT re-apply `schema.sql` first on a database that still has tags.**

The migration script is **self-sufficient**: it adds the new columns, backfills `category_id`,
then drops the legacy columns/table. `schema.sql` also drops the tag columns, so applying it
*before* the migration would destroy the tag data the backfill needs.

```bash
# 1. Backfill + drop legacy (adds columns itself if needed)
node scripts/migrate-gallery-categories.mjs

# 2. Re-apply the schema (idempotent — no-ops on what step 1 already did)
node scripts/setup-supabase.mjs
```

Fresh databases: apply `schema.sql` (via `setup-supabase.mjs`) first; there is no tag data to
backfill, and the migration then just reports "columns not found — skipping backfill".

The scripts write to the live Supabase database (the migration drops columns), so they are
**not** run automatically — run them deliberately and review the output (especially the
"Unmatched tags" warning line, which lists tiles left uncategorized).

## Verification checklist

- [x] Migration backfill — ran 2026-08-09 (see Status). Live DB re-checked the same day:
      49 tiles, all with `category_id`, `gallery_tags` gone (404), `gallery_item_categories`
      populated by the schema backfill
- [ ] Admin → Gallery: category picker/filters/counts, warning chip, editor requires a
      category — code-reviewed + typechecked; still needs a logged-in browser pass
- [ ] Admin → Categories: delete guards for gallery-used groups/children — code-reviewed;
      still needs a logged-in browser pass
- [ ] Admin → Products: "Add to Gallery also" creates/removes a linked tile — code-reviewed
      (`syncProductGalleryTile` wired into the product save); still needs a logged-in browser pass
- [x] `/gallery`: renders with the shop `CategorySidebar` (sticky desktop + mobile drawer),
      `?category=` deep link returns 200, captions show category paths (dev-server smoke test)
- [x] Home page: "Our Craft" uses category-path captions and caps at 2 per category (code +
      render check; only 1 tile is currently flagged `show_on_home`)
- [x] `npx tsc --noEmit`, `npx eslint src scripts`, `npm run build` — all pass

## Status

✅ **Migration run** (2026-08-09): `migrate-gallery-categories.mjs` backfilled all 50 tiles
(no unmatched tags) and dropped the legacy columns/table; `setup-supabase.mjs` re-applied
`schema.sql` idempotently. Verified: `category_id` populated on every tile; `tag`, `tags`,
and `gallery_tags` no longer exist.

✅ **Verification pass** (2026-08-09): `tsc --noEmit`, ESLint and `next build` all green.
Dev-server smoke test of `/`, `/gallery`, `/gallery?category=wall-arts` and `/shop` all
render — shared sidebar with counts ("photos"/"pieces"), category-path captions, deep link
resolves. Live DB re-check: 49 tiles (one fewer than at backfill time), all with
`category_id`, `gallery_item_categories` populated, `gallery_tags` 404. Also removed a
stale "thumbnail quick-select popover" comment in `src/app/admin/gallery/page.tsx` (that
UI never shipped — chips + the edit drawer cover category changes).

## Remaining / follow-ups

- ✅ Seeds already write `category_id` (verified — `supabase/seed.sql`, `seed-gallery.mjs`,
  `add-gallery-batch.mjs` all use it); re-running them stays optional/deliberate.
- If any tile is ever left uncategorized, assign it in Admin → Gallery (amber warning chip).
  Currently 0 uncategorized tiles.
