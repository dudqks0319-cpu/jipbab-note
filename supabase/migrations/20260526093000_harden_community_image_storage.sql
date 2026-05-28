-- 커뮤니티 이미지 버킷 업로드 경로를 사용자/기기 소유 prefix로 제한합니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-images',
  'community-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists community_images_insert_own_path on storage.objects;
create policy community_images_insert_own_path
on storage.objects
for insert
with check (
  bucket_id = 'community-images'
  and (
    (
      (select auth.uid()) is not null
      and name like ((select auth.uid())::text || '/%')
    )
    or (
      (select auth.uid()) is null
      and (select app.current_device_id()) is not null
      and name like ((select app.current_device_id()) || '/%')
    )
  )
);

drop policy if exists community_images_update_own_path on storage.objects;
create policy community_images_update_own_path
on storage.objects
for update
using (
  bucket_id = 'community-images'
  and (
    (
      (select auth.uid()) is not null
      and name like ((select auth.uid())::text || '/%')
    )
    or (
      (select auth.uid()) is null
      and (select app.current_device_id()) is not null
      and name like ((select app.current_device_id()) || '/%')
    )
  )
)
with check (
  bucket_id = 'community-images'
  and (
    (
      (select auth.uid()) is not null
      and name like ((select auth.uid())::text || '/%')
    )
    or (
      (select auth.uid()) is null
      and (select app.current_device_id()) is not null
      and name like ((select app.current_device_id()) || '/%')
    )
  )
);

drop policy if exists community_images_delete_own_path on storage.objects;
create policy community_images_delete_own_path
on storage.objects
for delete
using (
  bucket_id = 'community-images'
  and (
    (
      (select auth.uid()) is not null
      and name like ((select auth.uid())::text || '/%')
    )
    or (
      (select auth.uid()) is null
      and (select app.current_device_id()) is not null
      and name like ((select app.current_device_id()) || '/%')
    )
  )
);
