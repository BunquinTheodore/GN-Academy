# PROGRESS

## Phase 1 — Foundation (branch: phase-1-foundation)

- [x] Scaffold Next.js 15 + TS strict + Tailwind v4, git repo, state files
- [ ] Install locked stack deps (firebase, firebase-admin, supabase-js, zod, RHF, resend, shadcn/ui, vitest, playwright)   ← NEXT
- [ ] `verify` script in package.json (typecheck + lint + test + build)
- [ ] Env validation with Zod (`src/lib/env.ts`), `.env.example`, placeholder `.env.local`
- [ ] Design tokens (globals.css) + fonts per §11
- [ ] `CredentialCard` component in all four states + showcase route
- [ ] Firebase client init + auth helpers (email/password + Google)
- [ ] firebase-admin server init (`server-only`)
- [ ] `POST /api/auth/sync` — custom claim `role: authenticated` + profiles upsert
- [ ] `POST /api/auth/session` + DELETE — httpOnly session cookie
- [ ] Middleware protecting /dashboard/* and /admin/*
- [ ] Supabase client with Firebase token passthrough + server (service-role) client
- [ ] Migration 0001: profiles + RLS
- [ ] `scripts/make-admin.ts` + README docs
- [ ] Login / signup / forgot-password pages
- [ ] Basic dashboard shell (profile completeness placeholder)
- [ ] `.github/workflows/keep-alive.yml` + `backup.yml`
- [ ] Vitest unit tests (scoring engine comes in Phase 2; Phase 1: env validation, rate-limit helper if built)
- [ ] Playwright flow: sign up → claim synced → profiles query passes RLS → sign out → protected route redirects (BLOCKED until real keys exist)

Last verified: not yet run
Known gaps: no real API keys yet — `.env.local` holds placeholders; auth flows untestable end-to-end until keys are pasted (see BLOCKED.md)
