# PROGRESS

## Phase 1 — Foundation (branch: phase-1-foundation) — COMPLETE*
All items done; `npm run verify` green; Playwright 12/12 public flows; Lighthouse
mobile / 94-95 perf + 100 a11y, /ai-test 93 + 100.
*Gated on real keys (BLOCKED.md): full auth-flow e2e, applying migration 0001.
Merge to main once those pass.

## Phase 2 — The funnel (branch: phase-2-funnel)

- [x] Migration 0002: assessments, questions (no select policy — answers stay server-side), attempts, leads + RLS
- [x] seed.sql: AI Readiness diagnostic + 15 scenario questions to §8 calibration standard (PH work contexts)
- [x] Scoring engine: weighted competencies 25/20/35/20, bands, weakest-area — pure + 8 unit tests incl. §8 casual-user calibration
- [x] Anon visitor cookie (gn_anon, httpOnly, 1yr)
- [x] POST /api/attempts (rate-limited 5/IP/hr), PATCH answers, POST complete (server-side scoring; email capture rate-limited 3/IP/hr)
- [x] Quiz UI: one question/screen, progress bar, localStorage + server persistence, browser-back = previous question, error states
- [x] Email gate ONLY after final question; separate marketing consent; quiet skip link
- [x] Results page: score, 4 competency bars, level copy, weakest area, locked credential card, 2 CTAs, share button
- [x] Dynamic OG image (score + level) for results URLs
- [x] Lead capture into `leads` + welcome email (Resend; skips gracefully on placeholder key; resend.dev sender until domain verifies)
- [x] Anonymous attempts linked to account on signup via anon_id
- [x] Analytics event stubs (§13 names, typed) at all funnel call sites — provider wired Phase 4
- [x] /start-free stub; /ai-test start button live
- [ ] Full funnel e2e (take test → email → results → row in leads) — needs real keys + applied migrations   ← NEXT (blocked)
- [ ] Lighthouse on /ai-test/quiz + results — needs live DB to render
- [ ] Homepage was built in Phase 1; privacy/terms drafts done in Phase 1

Last verified: 2026-08-18 — verify green (16 unit tests), Playwright 14 passed / 2 key-gated skips.

Known gaps:
- Quiz/results pages render their error state until real Supabase keys + migrations exist.
- Welcome email uses onboarding@resend.dev until the domain is verified (BLOCKED.md).
- max_attempts not enforced for the diagnostic (unlimited by design; IP rate limit is the guard).

## Phase 3 — Certification and credentials (next 3 tasks)
1. Migration 0003: certifications, modules, lessons, enrollments, lesson_progress (+ FK assessments.certification_id)
2. Seed: Certified AI Virtual Assistant + free AI Foundations with modules/lessons + 3 demo credentials
3. /certifications catalogue + [slug] product page (server-rendered, JSON-LD Course)
