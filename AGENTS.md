# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

HeyKlever ("Klever AI") is a multi-tenant SaaS platform built with **Next.js 15** (App Router), **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Supabase** (PostgreSQL + Auth + Storage). It uses npm as its package manager (`package-lock.json`).

### Standard dev commands

All defined in `package.json`:

- **Dev server:** `npm run dev` (port 3000)
- **Lint:** `npm run lint` (ESLint — warnings only, no errors expected)
- **Build:** `npm run build`
- **Start (prod):** `npm start`

### Environment variables

A `.env.local` file is required at the project root. At minimum, the following must be set for the app to compile and start:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_STORAGE_BUCKET
```

Placeholder values allow the app to build and serve the public landing page, sign-in, and sign-up pages. Authenticated features (dashboard, billing, AI chat) require real Supabase and Stripe credentials.

### Key caveats

- **Supabase is required for auth-gated pages.** The middleware at `middleware.ts` calls Supabase Auth on every `/dashboard/*` request. Without a running Supabase instance, only public pages (landing, `/signin`, `/signup`, `/docs`) render.
- **No Docker/docker-compose setup exists** in this repo. Local Supabase requires installing the Supabase CLI and running `supabase start` (which itself needs Docker).
- **79 Supabase migrations** live in `supabase/migrations/`. These apply automatically with `supabase start` or `supabase db push`.
- **ESLint config** uses `next/core-web-vitals` and `next/typescript` with many rules set to `"warn"`. The lint step passes cleanly (exit 0) with warnings only.
- **Supabase Edge Functions** in `supabase/functions/` use Deno runtime and are excluded from the TypeScript/webpack compilation via `tsconfig.json` exclude and `next.config.ts` externals.
- **n8n webhooks** power most AI features (chat, RAG, doc generation). These are external services configured via `N8N_*` env vars.
- **`.env.local` must be regenerated from secrets on each session.** The file is `.gitignore`d. Write it from the injected environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Also set `NEXT_PUBLIC_SITE_URL` to the local dev URL and `SUPABASE_STORAGE_BUCKET` to the bucket name configured in the Supabase project.
- **Creating test users:** Use Supabase Admin API with the service role key: `POST ${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users` with `"email_confirm": true` to bypass email verification.
- **Stale `next-server` processes:** When restarting the dev server, always kill all `next-server` processes first (`lsof -ti :3000 | xargs -r kill -9`). Next.js will silently pick an alternate port if 3000 is occupied.
