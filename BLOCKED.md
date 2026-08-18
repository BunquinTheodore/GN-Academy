# BLOCKED

Items needing an action only the human can take.

## 1. Firebase service account JSON — MISSING (blocks all auth flows)
- **What:** The web config arrived, but not the admin credentials. Firebase console →
  Project settings → Service accounts → **Generate new private key** → a JSON file downloads.
- **Need:** The `client_email` and `private_key` values from that file, pasted into
  `.env.local` (or paste the whole JSON to me and I'll wire it in). Never commit the file.
- **Blocks:** /api/auth/sync, session cookies, sign-in e2e test, make-admin.

## 2. A way to run SQL on Supabase — migrations 0001 + 0002 + seed are waiting
Any ONE of:
- **(a)** Run `claude /mcp` in the terminal → select **supabase** → Authenticate
  (the MCP server config is already added). Then I can apply migrations myself.
- **(b)** The database password (set at project creation; resettable at
  Settings → Database).
- **(c)** Paste each file from `supabase/migrations/` + `supabase/seed.sql`
  into the dashboard SQL editor yourself, in order.

## 3. Supabase dashboard: register Firebase as third-party auth
Authentication → Sign In / Providers → Third Party Auth → **Add Firebase**,
project ID `gn-academy`. Dashboard-only; without it every authenticated query
fails with a JWT error even with correct keys.

## 4. Confirm Firebase sign-in providers
Part A asked for **Email/Password** and **Google** enabled
(Authentication → Sign-in method). Unconfirmed.

## 5. Resend domain (not urgent)
`re_...` key received. Until your sending domain verifies (SPF + DKIM), email
delivers only to your own address; sender is onboarding@resend.dev meanwhile.

## 6. Legal review of /privacy and /terms (unchanged)
Drafts are live and marked as drafts. NPC registration decision still yours.

---
Resolved: Supabase URL + anon key + secret key ✓ (note: the value pasted as
"service role secret" was the anon key again; the sb_secret_ key is used
instead and works). Resend key ✓. IP_HASH_SALT ✓. Firebase web config ✓.
