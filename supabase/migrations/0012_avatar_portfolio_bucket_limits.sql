-- 0012: enforce file size and MIME type limits on the avatars and portfolio
-- buckets. Both were created outside of a migration (README §3), so their
-- limits existed only as an operational step nobody could verify or
-- reproduce. `ImageUpload` always compresses to WebP client-side and uploads
-- with contentType "image/webp", so that is the only type either bucket ever
-- needs to accept; the size limit is generous headroom over the 0.4 MB
-- compression target, not a hard ceiling meant to be brushed up against.
--
-- `insert ... on conflict do update` rather than `do nothing` (unlike 0009):
-- these buckets already exist in every deployed environment, and the point
-- is to add the limits to them, not to leave a pre-existing row untouched.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/webp']),
  ('portfolio', 'portfolio', true, 2097152, array['image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
