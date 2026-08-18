# GN Academy

Professional AI certification and talent platform for Filipinos.
**Learn. Prove. Get hired.**

## Stack

Next.js 15 (App Router, TypeScript strict) · Tailwind v4 + shadcn/ui ·
Firebase Auth (client) + firebase-admin (server) · Supabase Postgres + Storage
(RLS everywhere) · Zod · react-hook-form · Resend · Vitest + Playwright.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in every value
   (Firebase web config, Firebase service account, Supabase keys, Resend key,
   a random `IP_HASH_SALT`).
3. In Supabase: **Authentication → Sign In / Providers → Third Party Auth →
   add Firebase** with your Firebase project ID. Without this, every
   authenticated query fails.
4. Apply migrations in `supabase/migrations/` in order (SQL editor, or
   `supabase db push` with a linked CLI).
5. `npm run dev`

## Auth model (read before touching auth)

Firebase is the identity provider; Supabase only verifies Firebase JWTs.
Supabase RLS requires a `role: "authenticated"` claim that Firebase doesn't
add — `POST /api/auth/sync` sets it server-side after first sign-in (the free
alternative to Blaze-only blocking functions), then the client force-refreshes
its token. Firebase UIDs are **text**, not UUIDs; policies compare
`auth.jwt() ->> 'sub'`. Do not "fix" either of these.

Sessions: the client exchanges its ID token at `POST /api/auth/session` for an
httpOnly cookie; middleware does an optimistic redirect for `/dashboard` and
`/admin`, and the layouts re-verify with firebase-admin.

## Make yourself admin

After signing up once in the app:

```
npm run make-admin -- you@example.com
```

Then sign out and back in. `/admin` checks the `admin` custom claim
server-side, not the profile row.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run verify` | typecheck + lint + unit tests + build — the definition of "done" |
| `npm run test:e2e` | Playwright flows (set `E2E_AUTH=1` with real keys for the full auth flow) |

## State files

`PROGRESS.md` (resume point), `DECISIONS.md` (judgement calls), `BLOCKED.md`
(things needing a human). Read these first.
