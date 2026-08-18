# PROGRESS

## Phase 1 — Foundation (branch: phase-1-foundation)

- [x] Scaffold Next.js 15 + TS strict + Tailwind v4, git repo, state files
- [x] Stack deps installed (firebase, firebase-admin, supabase-js, zod, RHF, resend, shadcn/ui, vitest, playwright)
- [x] `verify` script (typecheck + lint + test + build)
- [x] Env validation with Zod (client + server-only split), `.env.example`, placeholder `.env.local`
- [x] Design tokens (ink/paper/gold/blue, gold isolated to `verified` token) + Bricolage/Geist/mono fonts
- [x] `CredentialCard` in all four states (locked/goal/earned/verified) — visible on homepage + dashboard
- [x] Firebase client init + auth helpers (email/password + Google)
- [x] firebase-admin lazy server init (`server-only`)
- [x] `POST /api/auth/sync` — `role: authenticated` claim + profiles upsert + consent capture
- [x] `POST/DELETE /api/auth/session` — httpOnly session cookie (Firebase session cookie, 5 days)
- [x] Middleware: optimistic redirect for /dashboard + /admin, CSP/HSTS/security headers
- [x] Supabase browser client (token passthrough) + service-role server client
- [x] Migration 0001: profiles (+ column-protect trigger), rate_limits (+ atomic fn), audit_log — RLS on all
- [x] `scripts/make-admin.ts` (`npm run make-admin -- email`) + README docs
- [x] Login / signup / forgot-password pages (separate marketing consent, open-redirect guard)
- [x] Dashboard shell: profile completeness checklist + locked cert item + goal credential card
- [x] Admin shell gated on custom claim (404 for non-admins)
- [x] Homepage + marketing/legal pages, copy in `src/content/site.ts`
- [x] keep-alive.yml + backup.yml workflows
- [x] Vitest: 9 unit tests passing (schemas, open-redirect guard)
- [x] Playwright: 12/12 public-page + redirect tests passing (mobile + desktop)
- [ ] Playwright full auth flow — WRITTEN but gated on E2E_AUTH=1; needs real keys (BLOCKED.md #1)
- [ ] Lighthouse ≥90 mobile on touched pages ← NEXT
- [ ] Apply migration 0001 to real Supabase (BLOCKED.md #3)
- [ ] Merge to main once key-dependent checks pass

Last verified: 2026-08-18 — `npm run verify` all green (typecheck, lint, 9 unit tests, build);
`npm run test:e2e` 12 passed / 2 skipped (auth flow needs keys).

Known gaps:
- `.env.local` holds placeholders — every Firebase/Supabase/Resend call fails until real keys are pasted.
- /ai-test start button disabled (quiz engine is Phase 2). /verify lookup and /certifications catalogue are placeholders (Phase 3).
- /dashboard/profile is a stub (full editor Phase 5).
- Sonner toaster mounted but nothing fires toasts yet.

## Phase 2 — The funnel (next 3 tasks)
1. Migration 0002: assessments, questions, attempts, leads (+ RLS + anon insert policy)
2. Write the 15 AI Readiness questions to §8 calibration standard in seed.sql
3. Quiz UI: one question per screen, localStorage + server persistence, progress bar
