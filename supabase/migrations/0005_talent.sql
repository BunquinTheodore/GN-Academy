-- 0005: the talent layer — portfolio items, employer enquiries, and the
-- storage policies for the avatars/portfolio buckets.

-- ── portfolio_items ─────────────────────────────────────────────────────────
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  image_path text,                    -- object path inside the portfolio bucket
  project_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_items enable row level security;

create index portfolio_items_user_idx on public.portfolio_items (user_id, sort_order);

-- Readable by anyone only while the owner has chosen to be public. Turning
-- is_public off has to hide the work as well as the profile.
create policy "public portfolio select" on public.portfolio_items
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = portfolio_items.user_id and p.is_public = true
    )
  );

create policy "own portfolio select" on public.portfolio_items
  for select using ( (auth.jwt() ->> 'sub') = user_id );

-- Writes go through server actions (service role) so titles and URLs are
-- validated before they land on a public page.

create trigger portfolio_items_touch_updated_at
  before update on public.portfolio_items
  for each row execute function public.touch_updated_at();

-- ── employer_enquiries ──────────────────────────────────────────────────────
-- Contains an employer's contact details and free text, so no policies at
-- all: service role only, read from the admin queue.
create table public.employer_enquiries (
  id uuid primary key default gen_random_uuid(),
  employer_name text not null,
  employer_email text not null,
  company text,
  message text not null,
  talent_user_id text references public.profiles (id) on delete set null,
  credential_code text,
  status text not null default 'new' check (status in ('new', 'handled', 'spam')),
  ip_hash text,
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by text
);

alter table public.employer_enquiries enable row level security;

create index employer_enquiries_status_idx on public.employer_enquiries (status, created_at);

-- ── username shape ──────────────────────────────────────────────────────────
-- profiles.username is already unique; a public URL needs it to be a safe
-- slug too. Enforced in the database so a bad value cannot arrive by any path.
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$');

-- Case-insensitive uniqueness: "juana" and "Juana" must not be two people.
create unique index profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- ── storage policies ────────────────────────────────────────────────────────
-- Buckets `avatars` and `portfolio` are public-read. Writes are restricted to
-- the folder named after the uploader's Firebase UID, so nobody can overwrite
-- anyone else's file (§9).
create policy "public read avatars" on storage.objects
  for select using ( bucket_id = 'avatars' );

create policy "public read portfolio" on storage.objects
  for select using ( bucket_id = 'portfolio' );

create policy "own folder insert avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy "own folder update avatars" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy "own folder delete avatars" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy "own folder insert portfolio" on storage.objects
  for insert with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy "own folder update portfolio" on storage.objects
  for update using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy "own folder delete portfolio" on storage.objects
  for delete using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
