-- 0003: certifications, modules, lessons, enrollments, lesson_progress,
-- credentials + atomic credential-code sequences. Adds the deferred FK from
-- assessments to certifications.

-- ── certifications ──────────────────────────────────────────────────────────
create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  level text not null check (level in ('foundation', 'professional', 'advanced')),
  category text,
  format text,
  summary text,
  description text,
  skills text[] not null default '{}',
  outcomes text[] not null default '{}',
  roles text[] not null default '{}',
  price_php integer,
  is_free boolean not null default false,
  passing_score integer not null default 70,
  credential_prefix text unique not null,      -- e.g. CAVA → CAVA-2026-000123
  hero_image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certifications enable row level security;

create policy "published certifications select" on public.certifications
  for select using ( is_published = true );

alter table public.assessments
  add constraint assessments_certification_fk
  foreign key (certification_id) references public.certifications (id) on delete set null;

-- ── modules & lessons ───────────────────────────────────────────────────────
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications (id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0
);

alter table public.modules enable row level security;

create policy "modules of published certifications" on public.modules
  for select using (
    exists (
      select 1 from public.certifications c
      where c.id = modules.certification_id and c.is_published = true
    )
  );

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  slug text not null,
  content_mdx text,
  video_url text,
  duration_minutes integer,
  sort_order integer not null default 0,
  is_preview boolean not null default false,
  unique (module_id, slug)
);

alter table public.lessons enable row level security;

-- Lesson CONTENT is the paid product: readable only as a preview or with an
-- active/completed enrollment (§7). The enrollment-based policy is created
-- after the enrollments table below.
create policy "preview lessons select" on public.lessons
  for select using ( is_preview = true );

-- ── enrollments ─────────────────────────────────────────────────────────────
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  certification_id uuid not null references public.certifications (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'rejected')),
  progress_percent integer not null default 0,
  payment_method text,
  payment_ref text,
  amount_paid_php integer,
  enrolled_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  unique (user_id, certification_id)
);

alter table public.enrollments enable row level security;

create policy "own enrollments select" on public.enrollments
  for select using ( (auth.jwt() ->> 'sub') = user_id );
-- Writes go through server actions (service role): status transitions must
-- not be client-controllable.

create index enrollments_status_idx on public.enrollments (status, enrolled_at);

create policy "enrolled lessons select" on public.lessons
  for select using (
    exists (
      select 1
      from public.enrollments e
      join public.modules m on m.id = lessons.module_id
      where e.certification_id = m.certification_id
        and e.user_id = (auth.jwt() ->> 'sub')
        and e.status in ('active', 'completed')
    )
  );

-- ── lesson_progress ─────────────────────────────────────────────────────────
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "own lesson progress select" on public.lesson_progress
  for select using ( (auth.jwt() ->> 'sub') = user_id );

create policy "own lesson progress insert" on public.lesson_progress
  for insert with check ( (auth.jwt() ->> 'sub') = user_id );

-- ── credentials ─────────────────────────────────────────────────────────────
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  credential_code text unique not null,
  user_id text references public.profiles (id) on delete set null, -- null = demo/unlinked (deletion keeps the record, §14)
  certification_id uuid references public.certifications (id) on delete set null,
  holder_name text not null,
  title text not null,
  level text,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  competencies jsonb,
  pdf_url text,
  revoked_reason text,
  revoked_at timestamptz
);

alter table public.credentials enable row level security;

-- Public verification is the product (§7): everyone can read credentials.
create policy "credentials are public" on public.credentials
  for select using ( true );

-- ── credential code sequences ───────────────────────────────────────────────
-- {PREFIX}-{YEAR}-{SEQ}: per-prefix-per-year counter behind a row lock.
-- Never count(*)+1 (races); codes are permanent and never reused.
create table public.credential_sequences (
  prefix text not null,
  year integer not null,
  last_seq integer not null default 0,
  primary key (prefix, year)
);

alter table public.credential_sequences enable row level security;
-- Service role only; no policies.

create or replace function public.next_credential_code(p_prefix text)
returns text language plpgsql security definer as $$
declare
  v_year integer := extract(year from now() at time zone 'Asia/Manila');
  v_seq integer;
begin
  insert into public.credential_sequences as cs (prefix, year, last_seq)
  values (p_prefix, v_year, 1)
  on conflict (prefix, year)
    do update set last_seq = cs.last_seq + 1
  returning last_seq into v_seq;
  return p_prefix || '-' || v_year || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

revoke execute on function public.next_credential_code(text) from public, anon, authenticated;
