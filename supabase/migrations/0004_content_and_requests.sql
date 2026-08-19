-- 0004: blog posts and data-subject requests.
-- Post content lives in the DB (not in-repo MDX) for the same reason lesson
-- content does: §17's gate is that a non-developer publishes a post with no
-- deploy. next-mdx-remote still renders it.

-- ── posts ───────────────────────────────────────────────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content_mdx text,
  category text not null default 'General',
  cover_image_url text,
  author_name text not null default 'GN Academy',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

-- Published posts are public content; drafts are invisible to everyone but
-- the service role (i.e. /admin).
create policy "published posts select" on public.posts
  for select using ( status = 'published' );

create index posts_published_idx on public.posts (status, published_at desc);
create index posts_category_idx on public.posts (category);

-- ── data_requests ───────────────────────────────────────────────────────────
-- RA 10173 §16 subject requests: access, correction, deletion. Rows carry an
-- email and free-text details, so no policies at all — service role only,
-- read exclusively from the admin queue.
create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text,                       -- Firebase UID when the requester was signed in
  email text not null,
  kind text not null check (kind in ('access', 'correction', 'deletion')),
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'rejected')),
  resolution_note text,
  ip_hash text,                       -- salted, abuse investigation only (§14)
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

alter table public.data_requests enable row level security;

create index data_requests_status_idx on public.data_requests (status, created_at);

-- ── updated_at maintenance ──────────────────────────────────────────────────
-- Admin edits go through the service role, which bypasses RLS but not
-- triggers, so this keeps updated_at honest without trusting the caller.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

create trigger certifications_touch_updated_at
  before update on public.certifications
  for each row execute function public.touch_updated_at();

create trigger assessments_touch_updated_at
  before update on public.assessments
  for each row execute function public.touch_updated_at();
