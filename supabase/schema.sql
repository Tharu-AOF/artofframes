-- ============================================================
-- Art of Frames — shop schema
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Categories (two-level tree) ──────────────────────────────
create table if not exists categories (
  id         text primary key,                 -- slug, e.g. 'hotel-items', 'keytag'
  name       text not null,
  parent_id  text references categories (id) on delete cascade,
  sort_order integer not null default 0,
  active     boolean not null default true    -- hidden from the shop when false
);

alter table categories add column if not exists active boolean not null default true;

-- ── Products ────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category_id text not null references categories (id),
  price       text not null,
  description text not null default '',
  badge       text,
  engraving   text not null default '',
  customizable boolean not null default false, -- "Customizable" badge on shop cards
  color       text not null default '#CCA681',   -- brand tint for cards
  features    jsonb not null default '[]',
  materials   jsonb not null default '[]',
  created_at  date not null default current_date, -- drives "Most Recent" sort
  active      boolean not null default true,     -- hidden from the shop when false
  show_on_home boolean not null default false,   -- appears on the landing page
  sort_order  integer not null default 0
);

alter table products add column if not exists active boolean not null default true;
alter table products add column if not exists show_on_home boolean not null default false;
alter table products add column if not exists customizable boolean not null default false;

create index if not exists products_category_idx on products (category_id);

-- ── Product gallery images ──────────────────────────────────
create table if not exists product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url        text not null,
  sort_order integer not null default 0
);

create index if not exists product_images_product_idx on product_images (product_id);

-- ── Offers (shop header carousel) ────────────────────────────
create table if not exists offers (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  image_url  text not null,            -- cover image
  cta_label  text not null default 'Shop Now',
  cta_link   text not null default '/shop',
  active     boolean not null default true,
  sort_order integer not null default 0
);

create index if not exists offers_active_idx on offers (active, sort_order);

-- ── Discounts (scheduled sales on products or categories) ────
create table if not exists discounts (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('product', 'category')),
  target_id   text not null,          -- product uuid OR category slug
  type        text not null check (type in ('percent', 'flat')),
  value       numeric not null check (value > 0),
  starts_at   date,                   -- NULL = starts immediately
  ends_at     date,                   -- NULL = no end date
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists discounts_target_idx on discounts (target_type, target_id);

-- ── Product variations (size/material/tier options) ────────
create table if not exists product_variations (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  label      text not null,             -- e.g. "Small 12in", "5+ pcs"
  price      text not null,             -- e.g. "Rs. 2,500"
  sort_order integer not null default 0
);

create index if not exists product_variations_product_idx on product_variations (product_id);

-- ── Store settings (admin "General" page) ─────────────────
-- Key/value JSON settings — e.g. { "deliveryCharge": 500 } under
-- the key 'delivery'. Public reads feed the shop; writes are admin-only.
create table if not exists settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

-- ── Home page gallery tiles ────────────────────────────────
-- Tiles share the SAME categories table as products. category_id may
-- point at a group OR a leaf — filtering walks each tile's category
-- path, so a photo pinned to the "Wall Arts" group shows up wherever
-- "Wall Arts" is selected. product_id links a tile to the shop
-- product it mirrors ("Add to Gallery also"); deleting the product
-- removes its tile (cascade).
--
-- ⚠ EXISTING DATABASES: run this FIRST on a fresh database only.
-- On a database that still has legacy tags, run
--   node scripts/migrate-gallery-categories.mjs
-- BEFORE re-applying this file — it adds the columns above,
-- backfills category_id from tag/tags, then drops them. The drops
-- below are no-ops after it runs; the tag data is unrecoverable
-- once they execute.
create table if not exists gallery_items (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category_id  text references categories (id),   -- group or leaf; NULL = uncategorized
  image_url    text not null,
  color        text not null default '#CCA681',
  span         text not null default '',
  show_on_home boolean not null default false,   -- appears on the landing page
  sort_order   integer not null default 0,
  product_id   uuid unique references products (id) on delete cascade
);

alter table gallery_items add column if not exists show_on_home boolean not null default false;
alter table gallery_items add column if not exists category_id text references categories (id);
alter table gallery_items add column if not exists product_id uuid unique references products (id) on delete cascade;

-- Legacy free-form tag system — removed. On a fresh database the
-- create statement above never had these columns; on an existing one
-- the migration script backfills category_id first, and these drops
-- (no-ops after it runs) finish the job so the table matches.
alter table gallery_items drop column if exists tags;
alter table gallery_items drop column if exists tag;

-- Managed tag list — replaced by the categories table.
drop table if exists gallery_tags;

-- ── Gallery tile ↔ category (many-to-many) ────────────────
-- A tile can live under several categories. gallery_items.category_id
-- stays as the PRIMARY category (first selection — drives the home
-- page caption); this table holds the full set (primary included).
create table if not exists gallery_item_categories (
  gallery_item_id uuid not null references gallery_items (id) on delete cascade,
  category_id     text not null references categories (id) on delete cascade,
  primary key (gallery_item_id, category_id)
);

-- Backfill from the primary category — idempotent, safe to re-run.
insert into gallery_item_categories (gallery_item_id, category_id)
select id, category_id from gallery_items where category_id is not null
on conflict do nothing;

-- ── Row Level Security ──────────────────────────────────────
-- Shop reads are public (anon key). Writes require a logged-in
-- admin (authenticated role — created via Supabase Auth).
-- Policies are dropped + recreated so the script stays idempotent.

alter table categories           enable row level security;
alter table products             enable row level security;
alter table product_images       enable row level security;
alter table product_variations   enable row level security;
alter table gallery_items        enable row level security;
alter table gallery_item_categories enable row level security;
alter table discounts            enable row level security;
alter table offers               enable row level security;
alter table settings              enable row level security;

drop policy if exists "public read categories"          on categories;
drop policy if exists "public read products"            on products;
drop policy if exists "public read product_images"      on product_images;
drop policy if exists "public read product_variations"  on product_variations;
drop policy if exists "public read gallery_items"       on gallery_items;
drop policy if exists "public read gallery_item_categories" on gallery_item_categories;
drop policy if exists "public read discounts"           on discounts;
drop policy if exists "public read offers"              on offers;
drop policy if exists "admin write categories"          on categories;
drop policy if exists "admin write products"            on products;
drop policy if exists "admin write product_images"      on product_images;
drop policy if exists "admin write product_variations"  on product_variations;
drop policy if exists "admin write gallery_items"       on gallery_items;
drop policy if exists "admin write gallery_item_categories" on gallery_item_categories;
drop policy if exists "admin write discounts"           on discounts;
drop policy if exists "admin write offers"              on offers;
drop policy if exists "public read settings"           on settings;
drop policy if exists "admin write settings"           on settings;

create policy "public read categories"          on categories          for select using (true);
create policy "public read products"            on products            for select using (true);
create policy "public read product_images"      on product_images      for select using (true);
create policy "public read product_variations"  on product_variations  for select using (true);
create policy "public read gallery_items"       on gallery_items       for select using (true);
create policy "public read gallery_item_categories" on gallery_item_categories for select using (true);
create policy "public read discounts"           on discounts           for select using (true);
create policy "public read offers"              on offers              for select using (true);
create policy "public read settings"           on settings           for select using (true);

create policy "admin write categories"          on categories          for all to authenticated using (true) with check (true);
create policy "admin write products"            on products            for all to authenticated using (true) with check (true);
create policy "admin write product_images"      on product_images      for all to authenticated using (true) with check (true);
create policy "admin write product_variations"  on product_variations  for all to authenticated using (true) with check (true);
create policy "admin write gallery_items"       on gallery_items       for all to authenticated using (true) with check (true);
create policy "admin write gallery_item_categories" on gallery_item_categories for all to authenticated using (true) with check (true);
create policy "admin write discounts"           on discounts           for all to authenticated using (true) with check (true);
create policy "admin write offers"              on offers              for all to authenticated using (true) with check (true);
create policy "admin write settings"           on settings           for all to authenticated using (true) with check (true);

-- ── Chatbot knowledge base ─────────────────────────────────
-- Searchable text passages from the site's public pages. The bot
-- reads these (public read) and never sees structured product data
-- here — that lives in the products tables. Populated by
-- scripts/build-knowledge-base.mjs (npm run kb:refresh).
create table if not exists kb_chunks (
  id         uuid primary key default gen_random_uuid(),
  page       text not null,      -- site path, e.g. '/services/sign-boards'
  section    text not null,      -- nearest heading, e.g. 'Custom Engraving'
  title      text not null,      -- short label for this passage
  content    text not null,
  source_url text not null,
  updated_at timestamptz not null default now()
);

create index if not exists kb_chunks_page_idx on kb_chunks (page);

-- ── Chatbot logs ───────────────────────────────────────────
-- All writes happen server-side with the service role (RLS has NO
-- anon policies on these tables, so the browser can never read or
-- write chat data directly). Admins can read them for the future
-- chat dashboard.
create table if not exists chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null,
  role       text not null check (role in ('user', 'assistant', 'system')),
  message    text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_idx
  on chat_messages (session_id, created_at);

create table if not exists chat_unanswered (
  id         uuid primary key default gen_random_uuid(),
  session_id text,
  question   text not null,
  reason     text not null default 'unknown',
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists chat_handoffs (
  id         uuid primary key default gen_random_uuid(),
  session_id text,
  name       text,
  contact    text,
  message    text,
  source     text not null default 'chat',
  status     text not null default 'new'
             check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

-- ── Chatbot RLS ────────────────────────────────────────────
alter table kb_chunks       enable row level security;
alter table chat_sessions   enable row level security;
alter table chat_messages   enable row level security;
alter table chat_unanswered enable row level security;
alter table chat_handoffs   enable row level security;

drop policy if exists "public read kb_chunks" on kb_chunks;
drop policy if exists "admin write kb_chunks" on kb_chunks;
drop policy if exists "admin read chat_sessions" on chat_sessions;
drop policy if exists "admin read chat_messages" on chat_messages;
drop policy if exists "admin read chat_unanswered" on chat_unanswered;
drop policy if exists "admin read chat_handoffs" on chat_handoffs;

create policy "public read kb_chunks" on kb_chunks for select using (true);
create policy "admin write kb_chunks" on kb_chunks for all to authenticated using (true) with check (true);
create policy "admin read chat_sessions" on chat_sessions for select to authenticated using (true);
create policy "admin read chat_messages" on chat_messages for select to authenticated using (true);
create policy "admin read chat_unanswered" on chat_unanswered for select to authenticated using (true);
create policy "admin read chat_handoffs" on chat_handoffs for select to authenticated using (true);

-- ── Storage (product images + gallery uploads) ──────────────
-- The public bucket "product-images" and its access policies are
-- created by scripts/setup-supabase.mjs via the Management API
-- (storage.objects ownership prevents doing it from here).
