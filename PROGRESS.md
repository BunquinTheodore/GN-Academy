# PROGRESS

## Phase 1 — Foundation — ✅ COMPLETE AND FULLY VERIFIED (2026-08-18)
All items done against the live stack: auth-flow e2e passes (sign up → claim
sync → RLS profile read → sign out → protected redirect), migrations applied,
Lighthouse / 94-95 + 100, /ai-test 93 + 100. Merged to main.

## Phase 2 — The funnel — ✅ COMPLETE AND FULLY VERIFIED (2026-08-18)
Gate flow passes live on mobile + desktop: logged-out visitor completes the
15-question test, submits email at the post-test gate, sees the shareable
scored result, and appears in `leads` (verified in DB by the e2e itself).
RLS security e2e proves anon cannot read profiles/attempts/questions/leads.
Lighthouse: /ai-test/quiz 92 + 100 (page cached, revalidate 300s),
/ai-test/results/[id] 95 + 100. Welcome email sends via Resend (delivers
only to the account owner's address until the domain verifies). Merged to main.

Infrastructure notes:
- Migrations applied with `npx tsx scripts/apply-migrations.ts [--seed]`
  (tracks state in schema_migrations; safe to re-run).
- E2E: `$env:E2E_AUTH="1"; npm run test:e2e` runs the live flows (28 tests).
  Gated specs reset the rate_limits table first — local runs share one IP.

Known gaps:
- Analytics events are stubs (provider wired in Phase 4 per spec).
- Welcome email sender is onboarding@resend.dev until domain DNS verifies.
- GitHub Actions secrets not yet set (see BLOCKED.md) — keep-alive and backup
  workflows no-op until then.

## Phase 3 — Certification and credentials (branch: phase-3-certification)
- [ ] Migration 0003: certifications, modules, lessons, enrollments,
      lesson_progress, credentials (+ FK assessments.certification_id,
      credential code sequences)   ← NEXT
- [ ] Seed: Certified AI Virtual Assistant + free AI Foundations courses,
      modules/lessons, CAVA knowledge exam, 3 clearly-fictional demo credentials
- [ ] /certifications catalogue + [slug] product pages (JSON-LD Course)
- [ ] Enrollment flow with manual GCash/Maya reference confirmation
- [ ] /admin enrollment approval queue
- [ ] Course player with lesson progress
- [ ] Knowledge exam reusing the assessment engine (max_attempts enforced)
- [ ] Credential issuance: atomic {PREFIX}-{YEAR}-{SEQ} codes, PDF, audit_log
- [ ] /verify + /verify/[code] public pages (indexable, JSON-LD credential)
- [ ] Free AI Foundations course end-to-end
