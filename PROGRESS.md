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

## Phase 4 — Admin and content (next 3 tasks)
1. /admin CRUD: certifications, lessons, questions (the §8 "edit from admin" promise)
2. Leads CSV export + credential revocation with audit trail
3. MDX blog + sitemap/robots/OG images + analytics provider wiring
