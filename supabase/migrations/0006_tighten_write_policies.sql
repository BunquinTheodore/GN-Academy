-- 0006: remove the two RLS policies that let a signed-in browser write
-- directly to tables the application only ever writes with the service role.
--
-- Both were written in phase 1, when the plan was for the client to talk to
-- Postgres directly. It never does: every write goes through a server action
-- or a route handler, which validate first. Leaving the policies in place
-- meant the validation was one `supabase.from(...).update(...)` away from
-- being skipped, from the browser, by the account holder.

-- ── profiles ────────────────────────────────────────────────────────────────
-- The column-protect trigger already froze role, claims_synced, email and id,
-- so self-promotion to admin was never possible. What WAS possible was
-- everything the profile server action checks and this policy does not:
-- setting is_public without holding a credential, taking a username past the
-- length and reserved-word rules the action applies, and writing a 2 MB bio.
-- The public talent pages independently require an active credential, so this
-- closes a gap rather than a hole — but the validation belongs on both sides.
drop policy if exists "own profile update" on public.profiles;

-- Reading your own row stays: /talent and /employers are served from the
-- server, but the browser client still reads the signed-in user's profile.

-- ── attempts ────────────────────────────────────────────────────────────────
-- Attempts are created by POST /api/attempts, which rate-limits, stamps the
-- anonymous id, and hashes the IP. A direct insert skipped all three, so the
-- limiter protecting the funnel could simply be walked around.
drop policy if exists "insert own attempt" on public.attempts;

-- "select own attempts" stays — the dashboard reads them.
