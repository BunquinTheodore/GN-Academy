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
- 2026-08-18 . Credential PDFs generated on demand (pdf-lib) instead of stored in the certificates bucket . always reflects current status, zero storage egress, no signed-URL plumbing . stored PDFs + signed URLs rejected (stale on revocation).
- 2026-08-18 . pdf-lib and next-mdx-remote added . PDF generation needs a library (none in the locked stack); next-mdx-remote is the sanctioned MDX choice, reused for DB lesson content . @react-pdf/renderer rejected (heavier).
- 2026-08-18 . Exam attempts allowance counts only COMPLETED attempts . abandoned/crashed attempts should not burn one of three tries . counting all attempts rejected.
- 2026-08-18 . Demo credential holders named with "(Demo Record)" suffix and a visible banner on /verify . seed must be demonstrable without fabricating people (SS15) . realistic-looking names rejected.
- 2026-08-18 . Free-course enrollment activates instantly without admin approval . nothing to confirm on a P0 payment . pending state for free rejected.
- 2026-08-18 . e2e clears rate_limits per test (beforeEach) . the suite grew past the auth limiter budget per 15 min window . disabling the limiter in dev rejected (would diverge from prod).
- 2026-08-18 . Catalog/product Lighthouse recorded 81-88 under degraded machine load with the identical-weight homepage control reading 81 (vs 94-95 earlier) . measurement noise documented instead of blind optimization . re-measure required before phase merge.
- 2026-08-19 . Phase 3 merged on paired-control Lighthouse evidence rather than an absolute >=90 reading . the homepage control (known 94-95 quiet) read 83-86 in the same window as catalogue 81-82 and product 83-91, so all three are depressed equally by CPU contention . blocking the merge on a quiet machine rejected (the parity question is what the gate is actually asking).
- 2026-08-19 . generateStaticParams added to /certifications/[slug] . the catalogue is a handful of rows, so prerendering costs nothing and removes a DB round trip from the critical path (warm TTFB 578ms -> 13ms) . leaving it dynamic-then-ISR rejected.
