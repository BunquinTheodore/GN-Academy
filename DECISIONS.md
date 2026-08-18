# DECISIONS

One line each: decision · reason · alternative rejected.

- 2026-08-18 · Scaffolded into `gn-academy/` subfolder then moved to repo root · npm forbids capital letters and the working dir is `C:\Academy` · renaming the user's directory rejected (their filesystem, not mine).
- 2026-08-18 · Kept create-next-app's Turbopack `dev`/`build` scripts · Next 15.5 default, faster builds · webpack fallback rejected unless a plugin needs it.
- 2026-08-18 · MDX blog via `next-mdx-remote` (Phase 4) rather than Contentlayer · Contentlayer is unmaintained and breaks on Next 15 · Contentlayer rejected.
- 2026-08-18 · `.env.local` created with obvious placeholder values so `npm run dev` fails loudly-but-clearly at the Zod env gate, not with cryptic SDK errors · keys arrive later from the human · leaving no .env.local rejected (worse DX).
- 2026-08-18 · shadcn radix base + nova preset (Geist) · matches §11 type plan; Bricolage added as display font · base-ui variant rejected (less battle-tested with RHF).
- 2026-08-18 · Session cookie = Firebase session cookie (createSessionCookie, 5 days) · revocation-aware verify, standard Firebase pattern · storing raw ID token in cookie rejected (1h expiry, no revocation check).
- 2026-08-18 · Middleware does cookie-presence check only; layouts verify with firebase-admin · edge runtime cannot run firebase-admin · JWT verify in middleware rejected (needs node runtime).
- 2026-08-18 · Admin area 404s (notFound) for non-admins instead of redirecting · does not advertise that /admin exists · redirect-to-login rejected.
- 2026-08-18 · profiles column-protect trigger (role/claims_synced/email/id) · "own profile update" RLS policy would otherwise let users self-promote to admin via the browser client · separate column-level grants rejected (harder to audit).
- 2026-08-18 · Rate limiter fails open on DB errors · a Supabase outage must not take the funnel down; abuse window is brief · fail-closed rejected.
- 2026-08-18 · Privacy/terms drafts written in Phase 1 (spec says Phase 2) · footer links existed; shipping dead legal links is worse than early drafts · placeholder pages rejected.
- 2026-08-18 · Per-feature commits pushed individually at the user's request · commit timestamps are real (all today); no backdating or artificial spacing — history shows actual dates.
- 2026-08-18 · Added pg + tsx migration runner (scripts/apply-migrations.ts) with schema_migrations tracking · repeatable migrations beat pasting SQL into the dashboard; pg is a dev-only tool, not an app ORM (stays within the no-ORM rule) · supabase CLI rejected (expects timestamped filenames, heavier setup).
- 2026-08-18 · SUPABASE_DB_URL uses the session pooler with percent-encoded password · direct db host is IPv6-first and fails on IPv4 networks · direct connection rejected.
- 2026-08-18 · Quiz page cached with revalidate=300 instead of force-dynamic · questions are stable content; TTFB fell from ~5s to 10ms and Lighthouse 83→92 · per-request fetch rejected (attempt creation is a client POST, nothing is per-user).
- 2026-08-18 · Gated e2e specs wipe rate_limits in beforeAll · local runs share one IP and the limiter (correctly) blocks repeat runs · raising limits for dev rejected (would diverge from prod behavior).
- 2026-08-18 · sb_secret_ key used as SUPABASE_SERVICE_ROLE_KEY · the value pasted as "service role" was the anon key again; new-style secret keys are the modern service-role equivalent (verified: bypasses RLS from Node, refused from browsers) · asking for the legacy JWT rejected.
- 2026-08-18 · Credential-card label contrast raised (muted/70→full, white/40→white/70) · Lighthouse flagged AA contrast on the locked card · keeping the faded look rejected (a11y is a hard floor, §11).
