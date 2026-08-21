# PROGRESS

## Phase 1 — Foundation — ✅ COMPLETE AND FULLY VERIFIED (2026-08-18)
Auth-flow e2e passes live; Lighthouse / 94-95 + 100, /ai-test 93 + 100. On main.

## Phase 2 — The funnel — ✅ COMPLETE AND FULLY VERIFIED (2026-08-18)
Funnel + RLS e2e pass live; /ai-test/quiz 92 + 100, results 95 + 100. On main.

## Phase 3 — Certification and credentials (branch: phase-3-certification)

- [x] Migration 0003: certifications, modules, lessons (enrollment-gated RLS),
      enrollments, lesson_progress, credentials (public read), atomic
      credential-code sequences — applied to live DB
- [x] Seed: CAVA (₱1,499) + free AI Foundations with 14 real lessons, two
      knowledge exams (18 new questions), 3 fictional demo credentials;
      seed made idempotent
- [x] /certifications catalogue + [slug] product page (Course JSON-LD, ISR)
- [x] Enrollment: paid → pending with GCash/Maya reference; free → instant
- [x] /admin/enrollments approval queue (audit-logged, claim re-checked in action)
- [x] Course player: MDX lessons, preview gating, progress sync, next-lesson flow
- [x] Exam engine: max 3 attempts, server-scored, competency breakdown
- [x] Credential issuance: atomic {PREFIX}-{YEAR}-{SEQ}, audit_log, email
- [x] /verify + /verify/[code]: public, JSON-LD credential, revoked/not-found states
- [x] On-demand PDF certificates (pdf-lib, generated from the live record)
- [x] Dashboard: courses, assessments, credentials pages
- [x] E2E (36/36 passing live, mobile + desktop) including the phase gate:
      sign up → enroll free → all lessons → pass exam → credential issued →
      logged-out stranger verifies the code publicly; plus paid
      pending→approved→active
- [x] A11y: catalogue/product/verify all 100
- [x] Lighthouse perf gate: /verify/[code] 93-94 ✓. Catalogue and product
      re-measured 2026-08-19 against a paired homepage control in the same
      window: control 83-86 (94-95 on a quiet machine), catalogue 81-82,
      product 83-91, a11y 100 everywhere. The pages track the control within
      noise — the earlier 81-88 reading was CPU contention, not a regression.
      Also banked a real fix: generateStaticParams prerenders both product
      pages (warm TTFB 578ms → 13ms). Absolute numbers are worth one more
      read on a quiet machine, but the parity question is settled.
- [x] Merge phase-3-certification → main

Last verified: 2026-08-19 — verify green (16 unit tests), build green, e2e 36/36 live as of 2026-08-18.

Known gaps:
- Real GCash/Maya receiving numbers not yet in enrollment copy (BLOCKED.md).
- Enrollment-approved email not sent yet (only credential-issued is); add with
  Phase 4 email pass.
- GitHub Actions secrets still unset; gh CLI installed, awaiting `gh auth login`.
- Video lessons: schema supports video_url; no videos exist yet (content decision).

## Phase 4 — Admin and content (branch: phase-4-admin-content) — COMPLETE

Gate: *a non-developer publishes a new certification and a blog post with no
deploy.* Met — both are database-backed and edited from /admin.

- [x] Migration 0004: posts, data_requests, updated_at triggers — applied live
- [x] /admin CRUD: certifications, modules, lessons (nested <details> editors,
      one form per entity), questions with a competency-coverage panel
- [x] Credential revocation with a mandatory public reason + reinstate
- [x] Leads table + CSV export (admin claim re-checked in the route,
      audit-logged, formula-injection safe, UTF-8 BOM)
- [x] Enrollment-approved email
- [x] DB-backed MDX blog with categories, Article JSON-LD, two real seed posts
- [x] sitemap.ts, robots.ts, Organization JSON-LD, OG cards for certs + posts
- [x] Analytics: cookieless provider via two env vars; 11 of 12 §13 events
      wired. enrollment_confirmed and free_lesson_completed are counted from
      the database instead — see DECISIONS
- [x] /data-request form → admin queue → real account deletion (credentials
      retained but unlinked, audit_log retained, per §14 and /privacy)
- [x] Funnel metrics on /admin, last 30 days and all time, against §13 targets
- [x] E2E: 54/54 live (mobile + desktop), now against a production build
- [x] verify green: typecheck, lint, 21 unit tests, build

Real bugs found by moving e2e to a production build:
- Lesson progression needed a second click in production — chained action
  redirects are dropped by the App Router. Fixed by returning the href.
- The whole suite had been running against an unrelated project's server on
  port 3000.
- Data requests shared the email-capture rate-limit bucket.

Known gaps carried forward:
- Real GCash/Maya receiving numbers not yet in enrollment copy (BLOCKED.md).
- GitHub Actions secrets still unset; gh CLI installed, awaiting `gh auth login`.
- Analytics is inert until NEXT_PUBLIC_ANALYTICS_* are set (BLOCKED.md).
- Video lessons: schema supports video_url; no videos exist yet.

## Phase 5 — Talent layer — COMPLETE

- [x] Migration 0005: portfolio_items, employer_enquiries, username format +
      case-insensitive uniqueness, storage policies — applied to the live DB
- [x] Storage buckets `avatars` and `portfolio` created against the live project
- [x] /dashboard/profile: full editor + portfolio items, WebP upload
- [x] /talent/[username]: public profile, Person JSON-LD, credential links
- [x] /employers: directory with skill + certification filters
- [x] /employers/enquire + /admin/enquiries queue
- [x] /companies page; footer + sitemap wiring
- [x] E2E tests/e2e/talent-flow.spec.ts green

The talent e2e was red for a real reason, not for load. See Phase 6.

## Phase 6 — Hardening and launch readiness — COMPLETE

Six commits on `phase-5-talent`, merged to `main` as `6c92da7` and pushed.
`npm run verify` is green and the full live e2e suite is **64/64 with no
flakes, in 2.2 minutes** (it was 5.1 minutes before the last fix). See
README §21 and §22.

### The bug the talent suite was actually reporting

A server action that calls `revalidatePath` and returns state to
`useActionState` never finishes its transition in a production build. Measured
end to end: the action and the page re-render both complete on the server in
under a second, and the browser sits on a disabled "Saving…" button until the
test's 90-second budget runs out. It reproduces with a single call against an
unrelated fully dynamic route, disappears the moment the call is removed, and
`next dev` hides it completely.

Every admin editor called `revalidatePath`. **The whole admin area was broken
in production and the suite never noticed**, because no test had ever
submitted an admin form — they only read admin pages. Fixed:

- [x] `revalidatePath` removed from every state-returning action. Calls that
      targeted fully dynamic routes were no-ops and were deleted; the ones
      that mattered (`/certifications`, `/certifications/[slug]`,
      `/blog/[slug]`, `/ai-test/quiz`, `/sitemap.xml`) are now purged by
      `POST /api/revalidate`, fired by `AdminForm` after a successful save
- [x] Admin create/delete actions return `redirectTo` instead of calling
      `redirect()` — the same pattern the lesson player already uses
- [x] New e2e: an admin writes, publishes, and edits a post through the real
      UI, and a logged-out stranger reads it immediately
- [x] Profile saves measured 5/5 at 0.9–2.0s afterwards (was 2-of-3 hanging)
- [x] Same failure from the client side: `router.refresh()` immediately after
      `router.push()` in `CompleteLessonButton` stopped the lesson transition
      from ever completing. Bisected on one build with a runtime toggle — the
      journey passes in 36.4s without it and fails with it. Removed. **This
      one has not been through a full suite yet.**

### Correctness fixes found by an audit of the whole codebase

- [x] A rejected paid enrollment could never be re-submitted — the retry path
      existed but always hit the unique constraint, so a mistyped payment
      reference locked a paying customer out permanently. `createEnrollment`
      upserts now
- [x] Ticking "list me in the directory" without a credential threw the whole
      profile edit away while saying it had been saved. It now saves
      everything and holds back only the tick
- [x] A rejected enrollment rendered on the dashboard as an active course with
      a progress bar and a dead "Start learning" button
- [x] The exam result screen claimed "your credential is live" on any pass,
      including passes where no credential was issued
- [x] Two concurrent submissions of one exam attempt could both issue a
      credential. `completeAttempt` is now the claim on the attempt: the
      loser gets a 409
- [x] `POST /api/attempts` accepted any published assessment slug, including
      paid certification exams, skipping the enrollment and attempt-limit
      checks. Diagnostic only now
- [x] Account erasure left the avatar and portfolio images public at stable
      URLs. Storage folders are deleted first
- [x] Migration 0006 drops the two RLS policies that let a signed-in browser
      write directly (`profiles` update, `attempts` insert) — the app has
      never used them and they bypassed every server-side validation
- [x] `getSessionUser` wrapped in React `cache()`: one revocation round trip
      to Google per request instead of three
- [x] Dead-end messages ("email us", "our payment instructions page") now name
      a real address

### Configuration that no longer needs a developer

- [x] GCash/Maya receiving details are `NEXT_PUBLIC_PAYMENT_*` env vars
- [x] Email sender is `RESEND_FROM`
- [x] README rewritten as the complete reference for the codebase

### Still open — none of it is code

See `BLOCKED.md` and README §18: analytics account, Resend domain, payment
account details, legal review, brand wording, hosting, and the first cohort.
