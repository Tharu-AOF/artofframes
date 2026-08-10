# Admin Panel Performance Audit

Auditing why the admin panel (`/admin/*`) feels slow, fixing each cause, and
logging the results here. Every fix is added to this file as it lands.

## How the admin panel works (context)

- All admin pages are **client components**: the server sends a shell, and each
  page fetches its data in the browser with the logged-in Supabase session
  (`src/lib/admin-db.ts` uses the browser client + RLS "admin write" policies).
- So page responsiveness = **number of round trips × latency × payload size**,
  plus client re-renders. The server shell itself is fast; the data layer is
  where slowness lives.

## Suspects (from code read)

| # | Suspect | Where | Why it could be slow |
|---|---------|-------|----------------------|
| S1 | `getProducts()` pulls everything | `admin-db.ts` | Selects **all** products with every `product_images` + `product_variations` row — no limit/pagination. Grows with the catalog; also used by the categories page delete-guard just to check `category_id` usage. |
| S2 | `saveProduct()` = 5+ sequential round trips | `admin-db.ts` | Upsert → delete images → insert images → delete variations → insert variations, then `syncProductGalleryTile` (1–2 more), then a **full `load()`** refetch. One save = ~8 sequential DB calls. |
| S3 | Full list reload after every mutation | products/gallery/discounts/offers pages | `await load()` after each save/delete/toggle refetches the whole dataset instead of patching local state. |
| S4 | Rename category on every keystroke | `admin/categories/page.tsx` | `onChange` fires a DB write per keystroke (no debounce), plus a full `refresh()`. |
| S5 | Middleware session work | `middleware.ts` | Runs on every request — need to check whether it skips static assets / does a token refresh per request. |
| S6 | Admin image grids | admin gallery/products pages | `<Image fill>` with large originals; sizes may not match the small thumbnails, so the optimizer serves big images. |
| S7 | Delete-guard uses heavyweight queries | `admin/categories/page.tsx` | `removeGroup`/`removeChild` call `getProducts()` (all images/variations) + `getGallery()` just to count usage. |

## Measurement plan

1. Log in as `tharugraphicz` through the running dev server.
2. Time each admin page (server shell + client data load) and count network
   requests / payload sizes.
3. Confirm which suspects are real, fix them, and re-measure.

## Findings (updated per fix)

### Baseline (measured 2026-08-09, logged in as tharugraphicz on the dev server)

Catalog size: **131 products** (1 image each, 0 variations), 49 gallery tiles, 26 categories,
1 live discount.

| Page | Supabase requests on load | Worst query from the browser | Notes |
|------|---------------------------|------------------------------|-------|
| `/admin/products` | 4 (products ×2, categories ×2) | **products full: 326–1,378ms** | Table can't render until the FULL nested product payload (description/features/materials/images/variations/gallery link) arrives; ~3.4s of summed network time |
| `/admin/gallery` | 3 (gallery ×2, categories ×1) | gallery 211–1,142ms, categories 1,449ms | Same full-fetch pattern |
| `/admin` (overview) | 8 (4 queries ×2) | products full | 4 stat cards + 4 recent rows pull the entire catalog |
| `/admin/categories` | delete-guard | products **full** | Deleting a group triggers `getProducts()` (full nested!) just to count usage |

Root causes, in impact order:

1. **Every page fetches the full nested product payload** — description, features,
   materials, ALL image rows, variation rows and the gallery link — even when only a
   name/price/category is needed. The one query costs 0.3–1.4s from the browser.
2. **Dev StrictMode doubles every effect query** (React 19 / Next 16 default) — each page
   fires each read twice; the duplicates share nothing, so loads feel 2× slower in dev.
3. **Mutations chain sequential round trips then fully reload**: `saveProduct` = upsert →
   delete images → insert images → delete variations → insert variations → sync gallery
   tile → `load()` (2 more full queries). One save ≈ 7–9 sequential network calls.
4. **Category rename writes per keystroke** — every `onChange` fires a DB update + full
   tree refresh.
5. **Middleware `getUser()` hits Supabase on every /admin navigation** — ~300ms added per
   page change even with a valid session cookie.
6. Every browser call is preceded by a **CORS preflight** (OPTIONS), so each query is
   really 2 round trips.

## Fixes (updated per fix)

### ✅ F1 — Lightweight queries (`src/lib/admin-db.ts`, all admin pages)

- Replaced the always-full `getProducts()` with:
  - `getProductSummaries()` — id/name/category/price/badge/status/date/first image/variation
    prices only (the products table, discounts target picker, overview's recent list).
  - `getProduct(id)` — full single product, fetched ONLY when the editor opens.
  - `getProductCount()` / `getGalleryCount()` — `count=exact, head` (no rows).
  - `getProductCategoryIds()` / `getGalleryCategoryIds()` — tiny id/category rows for the
    categories page delete guards (were pulling the full catalog + full gallery).
- Overview page now loads 5 cheap queries (2 counts, categories, discounts, 4 recent
  summaries) instead of the full catalog + full gallery.

### ✅ F2 — Parallel saves + no full reload after mutations

- `saveProduct` now runs the image/variation deletes in parallel, then the inserts in
  parallel: 2 round-trip phases instead of 4 sequential + the old full refetch.
- Products / Gallery / Offers / Discounts pages patch their local list after save/delete/
  reorder instead of `await load()` (which re-fetched everything).

### ✅ F3 — Category rename debounced (`src/app/admin/categories/page.tsx`)

- Renames commit 600ms after typing stops (flushed on blur), never per keystroke, and the
  tree is patched locally — the old code fired a DB write + full tree refresh per key.

### ✅ F4 — Proxy (Next 16 middleware) fixed + skips the Supabase round trip

- **Discovery**: the old root `middleware.ts` was never actually running in dev — the auth
  guard silently didn't exist while developing (only the production build registered it).
  Next 16 renamed middleware → `proxy`, and with a `src/` layout the file must live at
  **`src/proxy.ts`**. Migrated and verified the guard now redirects (307) logged-out
  visitors.
- **Perf**: the session cookie is inspected locally — no cookie → redirect/allow instantly;
  unexpired JWT → allow instantly; only expired/mangled tokens hit `supabase.auth.getUser()`.
  Verified: **0 `/auth/v1/user` calls** during a logged-in navigation (was 1 per page).

### ✅ F5 — Concurrent-read dedupe (`src/lib/admin-db.ts`)

- A single-flight `once(key, loader)` shares one network request between concurrent
  identical reads, so React 19 dev StrictMode (which double-fires every effect) no
  longer doubles the load. Reads are deduped only while in flight — no stale cache.

### ✅ F6 — Minor

- `src/app/admin/login/page.tsx`: added the missing `sizes` prop to the logo (Next image
  warning).

### ✅ F7 — Login spinner can never hang forever (`src/app/admin/login/page.tsx`, `src/proxy.ts`)

- Reported: after the workspace was recreated, signing in spun forever. Reproduced the
  exact user state: a **stale expired Supabase session** left in the browser (cookie +
  localStorage) from the pre-close tab. That stale session makes the browser client try
  to recover/refresh a broken session, and a slow connection to Supabase (measured
  200ms–4.6s variance) leaves the sign-in POST hanging.
- Fixed (final):
  - The login page **clears stale `sb-*` auth storage on mount** (client-only, zero
    network) — the login page is only reachable with no valid session, so anything stored
    is stale.
  - The sign-in promise is raced against a **20s timeout** — a hung request shows "The
    sign-in request timed out — check your connection and try again" instead of an
    endless spinner.
  - `src/proxy.ts`'s `getUser()` fallback is bounded by an **8s timeout** so no admin
    navigation can hang on a slow Supabase refresh either.
  - (First attempt used `signOut({ scope: "local" })` to clear the session — that was a
    mistake: `signOut` awaits client initialization AND fires a logout network call when
    a stale session exists, so it could hang before the timeout. Removed.)
- Verified: injected the stale-session state → login page renders, mount wipes it (0
  cookies / no localStorage), credentials sign in, dashboard loads. Also verified the
  direct auth call returns 200 in ~500ms — credentials are valid.
- If it still hangs after a hard refresh, the remaining variable is the network path to
  `*.supabase.co` from the browser — the timeout now surfaces that as a clear error.

## Re-measure (after fixes, logged in, same dev server)

| Page | Before (Supabase requests / summed ms) | After (requests / summed ms) |
|------|----------------------------------------|------------------------------|
| `/admin/products` | 4 / 3,350ms (full catalog ×2) | **2 / ~430ms** (light summaries, deduped) |
| `/admin` overview | 8 / ~2,300ms (full catalog + gallery) | **5 / ~1,700ms** (2 counts + recent + discounts), wall ~600ms |
| `/admin/gallery` | 3 / ~2,800ms | **2 / ~550ms** (warm) |
| `/admin/categories` | 1 (+heavy guards on delete) | **1 / ~230ms** (guards now id+category only) |
| `/admin/discounts` | 3 (full catalog) | **3 / ~1,000ms**, wall ~360ms |
| Middleware per navigation | 1 Supabase `getUser()` call | **0 calls** (cookie fast path) |

Notes: the Supabase project itself has high, variable latency from this machine
(200ms–4.6s per request — cold connections were the worst), so request count is the
lever that matters. `saveProduct` went from ~5 sequential writes + full reload to 2
parallel phases + local list patch (≈2s+ saved per save). Category renames no longer
write per keystroke.

## Status

- [x] Create audit doc
- [x] Measure baseline
- [x] Fix: lightweight queries (products list / overview / delete-guards / pickers)
- [x] Fix: parallelize `saveProduct`, patch local state instead of full reloads
- [x] Fix: debounce category renames
- [x] Fix: middleware → `src/proxy.ts` with session-cookie fast path
- [x] Fix: dedupe concurrent reads (dev StrictMode double-fetch)
- [x] Re-measure + verify (see table above; tsc + ESLint green)

## Status

- [x] Create audit doc
- [x] Measure baseline
- [x] Fix: lightweight queries (products list / overview / delete-guards / pickers)
- [x] Fix: parallelize `saveProduct`, patch local state instead of full reloads
- [x] Fix: debounce category renames
- [x] Fix: middleware skips `getUser()` when the session cookie is fresh
- [x] Fix: dedupe concurrent reads (dev StrictMode double-fetch)
- [x] Re-measure + verify

## Gallery batch import #2 (2026-08-09)

Imported 77 new tiles from `C:/Users/tharu/Downloads/gallery images 2` via
`scripts/import-gallery-batch2.mjs` — adds to the gallery without clearing the
49 existing tiles (total now 126). Each image: auto-rotated, resized to long
edge 1600px, WebP q82 (matches existing tiles), copied to
`public/images/gallery/<category>/`. Creative titles per folder; category
assigned from the folder name against the category tree — `gift items - Event-gift`
and `other` went to the newly created top-level **other** category (no "Event Gift"
subcategory exists; user approved adding `other`).

Verified: 126 tiles all titled with resolvable images, 0 tiles missing a
join-table row, `other` category created, `/gallery` + `/gallery?category=keytags`
and the home page all render with the new tiles.
