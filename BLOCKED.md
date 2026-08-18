# BLOCKED

Items needing an action only the human can take.

## 1. Real API keys not yet in `.env.local`
- **What:** Firebase web config, Firebase service-account values, Supabase URL + anon + service-role keys, Resend API key.
- **Impact:** All auth/database/email flows are built but cannot be run end-to-end. Playwright auth flow is written but will fail until keys exist. `npm run build` works because env validation is lazy at runtime for server-only vars (build does not execute them).
- **Need from you:** Paste real values into `.env.local` (template in `.env.example`). Then run `npm run dev` and tell me, or just re-run me — session-start protocol will pick it up.

## 2. Supabase Third-Party Auth (Firebase) must be configured in the dashboard
- **What:** Part A step 2 — Authentication → Sign In / Providers → Third Party Auth → add Firebase with the Firebase project ID.
- **Impact:** Without it every authenticated Supabase query fails with a JWT error even after keys are pasted.

## 3. Supabase migrations must be applied
- **What:** `supabase/migrations/*.sql` need to run against the real project (SQL editor paste, or `supabase db push` with the CLI linked).
- **Need from you:** Nothing if you give me the DB password / access token; otherwise paste each migration into the Supabase SQL editor in order.

## 4. Legal review of /privacy and /terms (Phase 2)
- **What:** Drafts will be written per §14 but are NOT legal advice; RA 10173 compliance needs counsel.
- **Also:** NPC registration may be required once processing volume grows — business decision for you.
