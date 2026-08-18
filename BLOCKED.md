# BLOCKED

Items needing an action only the human can take.

## 1. Migrations cannot be applied from THIS session — one small step
The Supabase MCP server was authenticated, but MCP servers added mid-session
only attach after a session restart. Either:
- **(a)** Restart Claude Code in this folder (`claude` then `/resume` to pick
  the session back up) — I'll then apply 0001, 0002, and the seed myself; or
- **(b)** Paste the database password — I'll apply them via a direct
  connection right now; or
- **(c)** Paste `supabase/migrations/0001_profiles.sql`, then
  `0002_assessments.sql`, then `supabase/seed.sql` into the dashboard SQL
  editor yourself, in that order.
Blocks: auth-flow e2e, funnel e2e, anything touching the database.

## 2. Resend domain (not urgent)
Until your sending domain verifies (SPF + DKIM), email delivers only to your
own address; sender is onboarding@resend.dev meanwhile.

## 3. Legal review of /privacy and /terms (unchanged)
Drafts are live and marked as drafts. NPC registration decision still yours.

## 4. About-page brand wording (unchanged)
GN Academy vs MAZAL/GN Club relationship — business decision; About page stays
generic until decided.

---
Resolved 2026-08-18: Firebase web config ✓ · Firebase service account ✓
(admin SDK verified against live project) · Supabase URL/anon/secret keys ✓
(REST probe OK) · Third-Party Auth Firebase ENABLED ✓ (screenshot) ·
Email/Password + Google providers ENABLED ✓ · Resend key ✓ · IP_HASH_SALT ✓.
Note: the value pasted as "service role secret" was the anon key again; the
sb_secret_ key is its modern equivalent and is used instead.
