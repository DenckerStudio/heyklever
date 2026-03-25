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

# Optional overrides for MinIO and Qdrant
USE_MINIO=true
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_BUCKET=team-files

USE_QDRANT=true
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=documents
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
- **`GOOGLE_SERVICE_ACCOUNT_KEY` is multiline JSON.** When writing `.env.local`, this value must be kept on a single line (newlines escaped as `\\n`) or the dotenv parser will truncate it. Use a script to handle this properly rather than a heredoc.
- **Full env var list for `.env.local`:** Beyond the minimum listed above, the following injected secrets should also be written: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`, `SUPABASE_S3_ENDPOINT`, `N8N_API_KEY`, `N8N_BASE_URL`, `N8N_WEBHOOK_URL`, `KLEVERAI_WEBHOOK_URL`, `N8N_STORAGE_INGEST_WEBHOOK_URL`, `N8N_GENERATE_DOC_WEBHOOK_URL`, `N8N_TRAIN_AI_GENERATE_GUIDELINES_WEBHOOK_URL`, `N8N_GOOGLE_USER_EMAIL`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS`, `APP_ADMIN_EMAILS`.
