-- 0014: free certificate anchoring (salted leaf hash, daily Merkle batch,
-- OpenTimestamps on the root, which Bitcoin then confirms).
--
-- Apply with: npx tsx scripts/apply-migrations.ts   (owner only, never auto-run)
--
-- SALT DESIGN. `credentials` has a public select policy (using (true)), so any
-- column added to it is readable with the anon key. The salt is what stops a
-- chain-only observer from confirming a guess about a person, so it must not
-- live there. Column-level revokes on that table were rejected: the app and
-- scripts use `select *` on credentials and a future `grant select` or a new
-- migration would silently re-expose the column. Instead the salt lives in a
-- separate table with RLS on, NO policies and every privilege revoked from anon
-- and authenticated, so only the service role can read it. The salt is then
-- published deliberately, per credential, by GET /api/credentials/[code]/proof.
--
-- What stays on `credentials` is non-secret: the salted leaf hash, status,
-- batch id and the Merkle path.

-- Credential columns ---------------------------------------------------------

alter table public.credentials
  add column if not exists anchor_hash text,
  add column if not exists anchor_status text not null default 'skipped',
  add column if not exists anchor_batch_id uuid,
  add column if not exists anchor_proof jsonb;

alter table public.credentials
  drop constraint if exists credentials_anchor_status_check;
alter table public.credentials
  add constraint credentials_anchor_status_check
  check (anchor_status in ('pending', 'anchored', 'skipped'));

alter table public.credentials
  drop constraint if exists credentials_anchor_hash_format_check;
alter table public.credentials
  add constraint credentials_anchor_hash_format_check
  check (anchor_hash is null or anchor_hash ~ '^[0-9a-f]{64}$');

create index if not exists credentials_anchor_pending_idx
  on public.credentials (issued_at, id)
  where anchor_status = 'pending' and anchor_batch_id is null;

-- Salts: service role only ---------------------------------------------------

create table if not exists public.credential_anchor_secrets (
  credential_id uuid primary key references public.credentials (id) on delete cascade,
  salt text not null check (salt ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now()
);

alter table public.credential_anchor_secrets enable row level security;
-- No policies: with RLS on, anon and authenticated see nothing. Revoke the
-- table privileges as well so a mistaken policy later is not enough to leak it.
revoke all on table public.credential_anchor_secrets from anon, authenticated;

-- Batches --------------------------------------------------------------------

create table if not exists public.anchor_batches (
  id uuid primary key default gen_random_uuid(),
  merkle_root text not null unique check (merkle_root ~ '^[0-9a-f]{64}$'),
  leaf_count integer not null check (leaf_count > 0),
  -- Base64 of the full .ots file (digest = merkle_root). Text rather than
  -- bytea so it round-trips through PostgREST without hex escaping.
  ots_proof text,
  ots_status text not null default 'submitted'
    check (ots_status in ('submitted', 'confirmed')),
  bitcoin_block integer,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table public.anchor_batches enable row level security;
-- Service role only; no policies. Batches are served through the proof API.
revoke all on table public.anchor_batches from anon, authenticated;

alter table public.credentials
  drop constraint if exists credentials_anchor_batch_fk;
alter table public.credentials
  add constraint credentials_anchor_batch_fk
  foreign key (anchor_batch_id) references public.anchor_batches (id)
  on delete set null;

-- Atomic batch creation ------------------------------------------------------
-- One transaction: insert the batch and claim exactly the pending credentials
-- the caller built the tree from. If any of them was claimed or changed in the
-- meantime (two overlapping runs) the count differs, the function raises, and
-- the whole thing rolls back, so a batch never exists without all its leaves.
-- p_items: [{ "id": uuid, "leaf": "<hex>", "proof": [...] }, ...]

create or replace function public.anchor_create_batch(
  p_root text,
  p_ots_proof text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch uuid;
  v_expected integer := jsonb_array_length(p_items);
  v_updated integer;
begin
  insert into public.anchor_batches (merkle_root, leaf_count, ots_proof, ots_status)
  values (p_root, v_expected, p_ots_proof, 'submitted')
  returning id into v_batch;

  update public.credentials c
     set anchor_status = 'anchored',
         anchor_batch_id = v_batch,
         anchor_proof = i.proof
    from jsonb_to_recordset(p_items) as i(id uuid, leaf text, proof jsonb)
   where c.id = i.id
     and c.anchor_status = 'pending'
     and c.anchor_batch_id is null
     and c.anchor_hash = i.leaf;

  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'anchor batch claimed % of % credentials', v_updated, v_expected;
  end if;

  return v_batch;
end;
$$;

revoke all on function public.anchor_create_batch(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.anchor_create_batch(text, text, jsonb)
  to service_role;
