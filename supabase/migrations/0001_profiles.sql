-- 0001: profiles, rate_limits, audit_log
-- Firebase UIDs are strings, not UUIDs — every user id column is text.
-- RLS reads (auth.jwt() ->> 'sub'); this is correct for Firebase third-party
-- auth and must not be "fixed" to auth.uid()/uuid.

create extension if not exists pgcrypto;

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id text primary key,                        -- Firebase UID
  email text not null,
  full_name text,
  phone text,
  username text unique,
  headline text,
  bio text,
  avatar_url text,
  location text not null default 'Philippines',
  career_path text,
  situation text check (situation in ('student', 'employed', 'jobseeker', 'freelancer')),
  skills text[] not null default '{}',
  is_public boolean not null default false,
  claims_synced boolean not null default false,
  role text not null default 'student' check (role in ('student', 'admin', 'employer')),
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile select" on public.profiles
  for select using ( (auth.jwt() ->> 'sub') = id );

create policy "public profiles select" on public.profiles
  for select using ( is_public = true );

create policy "own profile update" on public.profiles
  for update using ( (auth.jwt() ->> 'sub') = id )
  with check ( (auth.jwt() ->> 'sub') = id );

-- Inserts happen server-side via the service role in /api/auth/sync,
-- which bypasses RLS. No insert policy for regular users: the profile row
-- is created for them, and role/claims_synced must not be client-writable.
-- Note: the update policy above allows a user to change their own row, so
-- sensitive columns are additionally protected by a trigger below.

create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer as $$
begin
  -- Only the service role (bypasses RLS, runs as table owner) may change
  -- role or claims_synced. auth.jwt() is null for service-role connections.
  if auth.jwt() is not null then
    new.role := old.role;
    new.claims_synced := old.claims_synced;
    new.email := old.email;         -- email changes go through Firebase, then sync
    new.id := old.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ── rate_limits ─────────────────────────────────────────────────────────────
-- Postgres-backed rate limiting (no free WAF). Key = sha256(ip + salt) + route.
create table public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No policies: only the service role touches this table.

-- Atomic check-and-increment. Returns true if the call is allowed.
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean language plpgsql security definer as $$
declare
  v_allowed boolean;
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else rl.count + 1
    end,
    window_start = case
      when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else rl.window_start
    end
  returning count <= p_max into v_allowed;
  return v_allowed;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- ── audit_log ───────────────────────────────────────────────────────────────
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
-- No policies: written and read only via the service role.
