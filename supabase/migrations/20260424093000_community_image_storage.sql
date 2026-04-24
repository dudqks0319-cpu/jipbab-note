-- 커뮤니티 사진 업로드용 공개 읽기 스토리지 버킷입니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-images',
  'community-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists community_images_public_read on storage.objects;
create policy community_images_public_read
on storage.objects
for select
using (bucket_id = 'community-images');

drop policy if exists community_images_insert_public on storage.objects;
create policy community_images_insert_public
on storage.objects
for insert
with check (bucket_id = 'community-images' and auth.role() in ('anon', 'authenticated'));

drop policy if exists community_images_update_own on storage.objects;
create policy community_images_update_own
on storage.objects
for update
using (bucket_id = 'community-images' and owner = auth.uid())
with check (bucket_id = 'community-images' and owner = auth.uid());

drop policy if exists community_images_delete_own on storage.objects;
create policy community_images_delete_own
on storage.objects
for delete
using (bucket_id = 'community-images' and owner = auth.uid());
