This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Chatbot (OpenRouter free models)

The site includes a floating chat assistant (Art of Frames virtual sales/support
agent, Sinhala + English) that answers from the store's live Supabase data and
from a searchable copy of the site's public pages. Full plan:
`docs/chatbot-implementation-plan.md`.

**Setup:**

1. Add to `.env.local` (server-side only, never commit it):
   ```
   OPENROUTER_API_KEY=sk-or-v1-...
   # OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free   # optional override
   ```
2. Apply the schema (adds `kb_chunks`, `chat_sessions`, `chat_messages`,
   `chat_unanswered`, `chat_handoffs`):
   ```bash
   node scripts/setup-supabase.mjs
   ```
3. Build the knowledge base (fetch the site's public pages into `kb_chunks`):
   ```bash
   npm run dev          # script reads the site over HTTP
   npm run kb:refresh   # re-run any time the site content changes
   ```
   Point it at the live site instead with `SITE_URL=https://your-site.com` in
   `.env.local`.

No extra runtime cost: the bot uses OpenRouter free models and Supabase's
free tier. Chat logs and hand-off requests are written server-side (service
role) and are only readable by admins — the browser never reads chat data.

The default model is `google/gemma-4-26b-a4b-it:free`. Set `OPENROUTER_MODEL`
to another available free OpenRouter model when needed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
