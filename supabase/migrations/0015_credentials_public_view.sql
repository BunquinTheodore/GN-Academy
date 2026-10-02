-- 0015: stop exposing every credentials column to the anon key.
--
-- 0003 created the policy "credentials are public" (for select using (true)),
-- so anyone holding the public anon key could read every column of every row,
-- including user_id (the holder's Firebase UID), revoked_reason and pdf_url.
-- Public verification only needs the fields below, so they are exposed through
-- a view with an explicit column list and the base table is closed to the
-- browser roles.
--
-- The app reads credentials server-side with the service role (supabaseAdmin),
-- which bypasses RLS and table grants, so it is unaffected. The only browser
-- Supabase client (src/lib/supabase/client.ts) is used for storage uploads.
--
-- The view runs with its owner's rights (security_invoker off, the default made
-- explicit) so it can read the table after anon/authenticated lose access.
-- New columns on credentials are NOT visible through it until added here.

create or replace view public.credentials_public
  with (security_invoker = off)
as
select
  credential_code,
  holder_name,
  title,
  level,
  issued_at,
  expires_at,
  status,
  competencies,
  revoked_at,
  anchor_hash,
  anchor_status,
  anchor_batch_id,
  anchor_proof
from public.credentials;

grant select on public.credentials_public to anon, authenticated;

drop policy if exists "credentials are public" on public.credentials;

revoke select on public.credentials from anon, authenticated;
