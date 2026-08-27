-- 0009: distinguish long-form blog posts from bite-sized short guides and
-- give admins a public media bucket for guide covers and step screenshots.

alter table public.posts
  add column content_type text not null default 'blog'
  check (content_type in ('blog', 'short_guide'));

alter table public.posts
  add column disclosure text;

-- Blog and short guides render at different public paths (/blog/{slug} vs
-- /short-guides/{slug}), so they must not compete for one global slug space.
alter table public.posts drop constraint posts_slug_key;
alter table public.posts add constraint posts_slug_content_type_key unique (content_type, slug);

create index posts_content_type_published_idx
  on public.posts (content_type, status, published_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guide-media',
  'guide-media',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "public read guide media" on storage.objects
  for select using (bucket_id = 'guide-media');

create policy "admins insert guide media" on storage.objects
  for insert with check (
    bucket_id = 'guide-media'
    and (auth.jwt() ->> 'admin') = 'true'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy "admins update guide media" on storage.objects
  for update using (
    bucket_id = 'guide-media'
    and (auth.jwt() ->> 'admin') = 'true'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

create policy "admins delete guide media" on storage.objects
  for delete using (
    bucket_id = 'guide-media'
    and (auth.jwt() ->> 'admin') = 'true'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
