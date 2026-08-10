# Website Chatbot — Implementation Plan (Art of Frames)

A chat widget for the Art of Frames site that acts as a **friendly sales and
support assistant** — answering product, price, service, delivery and ordering
questions naturally (Sinhala + English), powered by the **Gemini free API**.
Cost: **$0** (only outside service: Google's free Gemini allowance).

> **Status: implemented and live on the dev server (2026-08-10).** v1.2 (2026-08-10):
> **robustness upgrade** — structured customer state (recipient / occasion / budget /
> product type / last recommended) rebuilt from the conversation (`src/lib/chat/state.ts`),
> a deterministic mode router (browse / discover / compare / detail / quote / order /
> support / track — `src/lib/chat/modes.ts`), a rewritten contradiction-free system
> prompt with a goal-first instruction hierarchy, match-signal confidence gating for
> product cards, deterministic compare / "other options" / pronoun-price / order-help
> paths, mode-aware widget chips, and a golden test harness: `npm run chat:test`
> (43 checks, no AI cost) + `npm run chat:test:live` (14 end-to-end cases; needs the
> dev server). Schema applied to the
> live DB (`kb_chunks` + chat log tables); keys in `.env.local`: `GEMINI_API_KEY`
> (`gemini-3-flash-preview` — the free-tier model for new keys) and `OPENROUTER_API_KEY`
> (`google/gemma-4-26b-a4b-it:free`, used whenever set; retries across providers + a
> fallback model). Knowledge base built (`npm run kb:refresh` → 22 passages across 4
> pages; `/shop` excluded so prices never duplicate the products tables). `tsc --noEmit`,
> ESLint, `next build` green.
> Live tests passed: product answers with real Supabase prices + product cards,
> budget-filtered gift recommendations, delivery charge from settings, deterministic
> Royal Express waybill tracking (works even with no AI quota), knowledge-base answers,
> honest "don't know" + hand-off for discounts, and chat logging to Supabase. Product
> cards only render when the reply is really about products (marker + name check).
> **Remaining:** owner review of real conversations; admin dashboard for the logs
> (deferred to v1.1).

## Goal (plain words)

The bot should behave like a helpful human customer-service **and** sales
representative:

- Answer questions about products, prices, sizes, materials, and services.
- Help customers choose products (gift recommendations, budget, occasion).
- Answer delivery, ordering, and business questions.
- Understand natural conversation and follow-ups ("and how much is that?").
- Guide customers toward ordering / tracking when appropriate.
- **Never invent prices, availability, policies, or order information.**
- Hand the conversation to a human when it can't confidently help.
- Log unanswered questions so the site/business can improve over time.

## Core principle

**Supabase is the source of truth. Gemini is not.**

Gemini is never trusted to remember product prices, availability, order status,
delivery charges, policies, or specs. The app retrieves the current information
from Supabase (or the tracking service) and hands only the relevant facts to
Gemini, which is responsible for **natural conversation**, not facts.

## What actually exists in this repo (audit findings)

| Area | Reality in the repo | Consequence for the chatbot |
|------|---------------------|-----------------------------|
| Products | `products` table: name, `price` (**text**, e.g. `"Rs. 2,500"`), description, features, materials, `customizable` flag, active flag | Product lookups query Supabase directly. Prices must be parsed with the existing `parsePrice()` helper (`src/components/shop/data.ts`) for budget filters; some products have unparseable "Custom Price" — handle gracefully |
| Variations | `product_variations`: label + own `price` text per size/tier | "10x12 frame එක කීයද?" resolves to a variation lookup, not a guess |
| Discounts | `discounts`: product/category, percent/flat, scheduled | Live discounts already resolved server-side (`shop-db.ts`); the bot reports current effective price |
| Stock | **No stock/quantity column exists** | Products are made-to-order. "Availability" = "we make to order — team will confirm timeline", from the knowledge base — never a DB query |
| Orders | **No `orders` table, no order system.** Tracking = Royal Express waybill via existing `POST /api/track` proxy (Curfox) | Order questions: bot asks for the waybill number, calls the same `/api/track` endpoint, and summarizes the live status. No invented statuses |
| Services | **No services table.** Static pages (`/services/sign-boards`) + home sections (`Services.tsx`, `ContactUs.tsx`, `BulkOrderCTA.tsx`) | Service info lives in `kb_chunks`. Sign board pricing is structured (below) |
| Business settings | `settings` JSON: `delivery` → `deliveryCharge`; `signboard` → per-material rates, min charge, rounding | Delivery charge and sign board rates are structured lookups; the sign board *calculator* stays on the page (bot links to it) |
| Contact info | Static (`ContactUs.tsx` home section) | Goes into `kb_chunks`; hand-off uses the business's real contact channel |
| API pattern | `src/app/api/track/route.ts` — server proxy, key/tenant in env, friendly errors | The chat route follows the same shape |

## Information sources

### A. Structured business data (Supabase — direct queries)

- Products, categories, product variations (sizes/materials + price)
- Live discounts → current effective price
- Delivery charge (`settings` → `delivery`)
- Sign board material rates (`settings` → `signboard`)

### B. Website knowledge base (`kb_chunks` — text retrieval)

Only written content that isn't structured data:

- About Art of Frames
- General ordering / customization instructions
- General FAQ, return/exchange info, policies
- Services text, contact details, delivery info beyond the flat charge

**The knowledge base must NOT duplicate product/pricing data** — that lives in
Supabase, or there will be two sources of truth.

## Knowledge base table

```sql
create table if not exists kb_chunks (
  id         uuid primary key default gen_random_uuid(),
  page       text not null,   -- e.g. 'services'
  section    text not null,   -- e.g. 'custom-engraving'
  title      text not null,   -- e.g. 'How custom engraving works'
  content    text not null,
  source_url text not null,
  updated_at timestamptz not null default now()
);
```

## Knowledge base builder

- `scripts/build-knowledge-base.mjs` + `src/lib/kb.ts`, run via `npm run kb:refresh`.
- Reads the site's public pages (home, `/shop`, `/services/sign-boards`,
  `/track-order`, `/gallery`); ignores `/admin`, `/cart`, search/filter URLs.
- Strips shared nav/footer, extracts main content, splits into ~200–300 word
  passages labeled with page + section, upserts into `kb_chunks` (idempotent —
  re-running replaces, never duplicates).

## Retrieval strategy

**Intent first, then retrieve the right source.** Do NOT rely on keyword matching
alone for everything.

```
"Mommy frame එකක් කීයද?"          → product/variation lookup   → Supabase
"Custom engraving කොහොමද?"        → knowledge search          → kb_chunks
"මගේ order එක කොහෙද?"             → waybill lookup             → /api/track
"girlfriendට anniversary gift එකක්" → category/budget search    → Supabase → Gemini recommendation
"Delivery කීයද?"                   → settings                  → Supabase
```

- **Intent detection**: Gemini (cheap, few tokens) — not a hand-written
  Sinhala/English rule router. This is a v1 trim: the earlier plan's "answer
  simple price questions without any Gemini call" fast path is deferred; instead
  cache the top ~20 common Q&A server-side to save requests.
- **Data retrieval**: deterministic functions (below) — Gemini never runs
  database queries itself.
- **Formulation**: Gemini receives only the retrieved facts + chat history.

## Gemini's role

- Natural-language understanding, intent detection, conversational context
- Product recommendations (combining retrieved products)
- Writing friendly, concise responses; Sinhala/English mixed; follow-ups

Gemini does **not** retrieve authoritative business information by itself.

## Chat persona

Art of Frames virtual sales/support assistant — not a generic AI:

- Friendly, warm, natural, helpful, concise, human-like; professional but not
  stiff; comfortable with Sinhala + English; emojis used naturally, not spammed.
- Never says "as an AI language model…"; never mentions being AI unless asked.

Example: "ඔව් 😊 මේක birthday gift එකකට හොඳ option එකක්. ඔයාගේ budget එක roughly කීයක් වගේද?"

## Accuracy rules (non-negotiable)

1. **Never invent prices** — if the current price can't be found: "මේ product
   එකේ current price එක මට confirm කරගන්න බැහැ. අපේ team එකෙන් check කරලා දෙන්නම්."
2. **Never invent availability** — there's no stock data; products are made to
   order: "Availability එක මට මේ වෙලාවේ confirm කරන්න බැහැ."
3. **Never invent order status** — only via `/api/track` with a waybill number.
4. **Never invent policies** — if not in the business data/knowledge base: "ඒ
   ගැන මට confirm information එකක් නැහැ."
5. **Human fallback** — low confidence or customer asks for a person: "මේක අපේ
   team එකෙන් check කරලා දෙන්නම් ❤️" → **Talk to a Person** action.

## Order tracking (corrected)

No orders table exists — use the existing Royal Express integration:

```
"මගේ order එක කොහෙද?"
   → bot asks for the waybill number
   → POST /api/track { waybill_number }   (existing proxy)
   → current status + last event, summarized in a friendly tone
   → if the bot can't find it: "ඒ waybill එක හම්බුනේ නැහැ" → direct to /track-order
```

## Product discovery / sales assistance

The bot is a sales assistant, not just an FAQ:

- "Wedding gift එකකට මොනවද තියෙන්නේ?" → category search → **product cards**.
- "Rs. 3000ට අඩුවෙන් තියෙන ඒවා?" → price filter using `parsePrice` (skip
  unparseable "Custom Price" products in strict filters; mention them separately).
- "Wooden එකක් ඕන" → filter by `materials`.

Product cards (2–4 per reply, not a dump): image · name · starting/current price ·
short description · **View Product** button (links to the shop/product modal).

## Chat widget

`src/components/chat/` — floating bubble (bottom corner) added in
`src/app/layout.tsx` so it appears on public pages. Opening shows a greeting
("Hi! 👋 How can I help you today?") + quick-action chips: gift help, prices,
custom orders, delivery. Includes typing indicator, suggested questions, and the
hand-off. Mobile-first, responsive, keyboard-friendly, on-brand.

## Human handoff

**Talk to a Person** → form (name, email/WhatsApp, message) → saved to a new
`chat_handoffs` table (status: `new` / `in_progress` / `resolved`). The
unanswered question is recorded too, so the owner can see what info is missing.

## Chat logging

New tables (create in v1, admin UI later):

- `chat_sessions` (session id, timestamps)
- `chat_messages` (session id, role `user|assistant|system`, message)
- `chat_unanswered` (question, reason, resolved flag)

Purpose: "Customers keep asking about delivery to Kandy" → update the site.

## Privacy / sensitive info

Warn users not to enter card numbers, passwords, NIC/passport numbers, etc.
Payments go through the official process, never collected in chat.

## Free-tier strategy & graceful failure

- Stay as close to $0 as possible: cache common answers, keep prompts small,
  only send retrieved facts (never the whole database) to Gemini.
- The free allowance (~10 req/min, ~1,500/day, resets midnight Pacific) is not a
  guarantee — Google can change it. On quota errors, no technical errors: "අපේ
  chat assistant එක මේ වෙලාවේ ටිකක් busy 😊 message එකක් leave කරන්න." → **Leave a
  Message** form.

## API architecture

`src/app/api/chat/route.ts` (mirrors the `/api/track` route style):

```
POST /api/chat
  → validate request (length caps, rate limit)
  → load conversation context (chat_sessions/chat_messages)
  → Gemini intent detection
  → retrieve required data (Supabase / kb_chunks / /api/track)
  → build trusted context (facts only, no full DB)
  → Gemini formulates friendly response
  → validate/log response
```

- `GEMINI_API_KEY` lives **server-side only** (`.env.local`); never shipped to
  the browser.
- Simple in-memory rate limiter on the route (none exists in the repo today).

## Controlled retrieval functions

`src/lib/chat/` — the chatbot's trusted data layer (reuses existing helpers):

- `products.ts` — `search_products`, `get_product`, `get_products_by_category`,
  `get_products_by_price` (uses `parsePrice`), `get_products_by_material`
- `delivery.ts` — `get_delivery_info` (settings), `get_signboard_rates` (settings)
- `tracking.ts` — `get_order_status(waybill)` → wraps `POST /api/track`
- `knowledge.ts` — `search_knowledge(query)` → kb_chunks

## Security

- Validate + rate-limit all incoming messages.
- Gemini key and Supabase service credentials stay server-side.
- Shop data: public-read RLS already in place — chat reads use it.
- Chat tables: anon users may **insert** (bounded) but never read; server-side
  writes preferred. No customer chat history is exposed to other visitors.
- Waybill lookups: only return what `/api/track` already returns publicly.

## Development phases

| Phase | Scope |
|-------|-------|
| **1 — Data audit (corrected)** | Map existing schema → retrieval functions. Mostly reading `shop-db.ts` / `settings.ts` / `api/track`; no reverse-engineering needed |
| **2 — Retrieval layer** | `src/lib/chat/*` (products, delivery, tracking, knowledge) |
| **3 — Knowledge base** | `kb_chunks` table, `scripts/build-knowledge-base.mjs`, `src/lib/kb.ts`, `npm run kb:refresh` |
| **4 — Gemini integration** | `src/lib/gemini.ts`: system instructions (persona + accuracy rules) + facts + history; small prompts, server-side key |
| **5 — Chat API** | `src/app/api/chat/route.ts`: validation, rate limiting, intent, retrieval, response, logging |
| **6 — Chat UI** | `src/components/chat/` (widget, message, input, product card, quick questions, typing, hand-off) |
| **7 — Sales flow** | Gift discovery: occasion → budget → recipient → recommendations → product page |
| **8 — Order assistance** | Waybill-based tracking conversation; guide to cart/hand-off. **Order creation is out of scope (confirmed decision, not just deferred)** |
| **9 — Human handoff + logging** | `chat_handoffs`, `chat_messages`, `chat_unanswered` written from day one. **Admin dashboard deferred to v1.1** (tables exist now) |
| **10 — Testing** | 50–100 realistic Sinhala/English conversations (products, prices, budgets, gifts, services, waybills, edge cases like "iPhone එකක් කීයද?" / "discount එකක් දෙන්න") — no hallucinated answers |

## Success criteria (v1)

- Prices come straight from Supabase; recommendations use real products.
- No invented prices / availability / policies; order status only from `/api/track`.
- Sinhala/English mixed and follow-ups work naturally.
- Human hand-off works; unanswered questions logged.
- Quota/Gemini failures degrade gracefully ("leave a message").
- Mobile-friendly; keys never client-side; rate limiting in place.
- `npx tsc --noEmit`, `npx eslint src scripts`, `npm run build` pass.

## Final architecture

```
                     ART OF FRAMES
                          │
                          ▼
                   Chat Widget (public pages)
                          │
                          ▼
                 /api/chat (validate, rate-limit)
                          │
         ┌────────────────┼─────────────────┐
         ▼                ▼                 ▼
   Supabase           kb_chunks        /api/track
   products /         (site text)      (Royal Express
   variations /                       waybill lookup)
   discounts /
   settings
         └────────────────┼─────────────────┘
                          ▼
                     Gemini (free API)
                   — persona + accuracy rules
                   — intent + friendly wording
                          │
                          ▼
                       Customer
```

## Initial scope (v1)

1. Product questions · prices · product discovery · gift recommendations
2. Services · delivery / general FAQ
3. Order tracking guidance — customer provides the waybill number, bot calls
   `/api/track` and summarizes the live status (confirmed: no order creation)
4. Human hand-off · unanswered-question logging
5. Graceful free-tier/quota handling

**Out of scope:** order creation, cart/checkout integration. The bot only
*answers* order inquiries — never places, changes, or fabricates orders.

**Deferred:** admin chat dashboard UI, no-Gemini fast path for simple questions,
embedding-based retrieval.

## What I need from you (before building)

1. Confirm the pages to include in the knowledge base (D1 earlier) — and whether
   contact/hand-off should use email, WhatsApp, or both (contact info currently
   lives statically in `ContactUs.tsx`).
2. A Gemini free API key (Google AI Studio) — goes in `.env.local` as
   `GEMINI_API_KEY`; never committed or shown client-side.
3. The hand-off destination (email address / WhatsApp number).
4. Tone preferences (casual vs formal, emoji use).
