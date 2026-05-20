-- RLS 정책의 auth/app 함수 호출을 initplan으로 캐시해 row별 재평가를 줄입니다.

drop policy if exists ingredients_select_own on public.ingredients;
create policy ingredients_select_own
on public.ingredients
for select
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists ingredients_insert_own on public.ingredients;
create policy ingredients_insert_own
on public.ingredients
for insert
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists ingredients_update_own on public.ingredients;
create policy ingredients_update_own
on public.ingredients
for update
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
)
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists ingredients_delete_own on public.ingredients;
create policy ingredients_delete_own
on public.ingredients
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own
on public.favorites
for select
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own
on public.favorites
for insert
with check (
  (
    ((select auth.uid()) is not null and user_id = (select auth.uid()))
    or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
  )
  and exists (
    select 1
    from public.recipes r
    where r.id = favorites.recipe_id
  )
);

drop policy if exists favorites_update_own on public.favorites;
create policy favorites_update_own
on public.favorites
for update
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
)
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own
on public.favorites
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists shopping_items_select_own on public.shopping_items;
create policy shopping_items_select_own
on public.shopping_items
for select
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists shopping_items_insert_own on public.shopping_items;
create policy shopping_items_insert_own
on public.shopping_items
for insert
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists shopping_items_update_own on public.shopping_items;
create policy shopping_items_update_own
on public.shopping_items
for update
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
)
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists shopping_items_delete_own on public.shopping_items;
create policy shopping_items_delete_own
on public.shopping_items
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own
on public.community_posts
for insert
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own
on public.community_posts
for update
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
)
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own
on public.community_posts
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists community_comments_insert_own on public.community_comments;
create policy community_comments_insert_own
on public.community_comments
for insert
with check (
  (
    ((select auth.uid()) is not null and user_id = (select auth.uid()))
    or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
  )
  and exists (
    select 1
    from public.community_posts p
    where p.id = community_comments.post_id
  )
);

drop policy if exists community_comments_update_own on public.community_comments;
create policy community_comments_update_own
on public.community_comments
for update
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
)
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists community_comments_delete_own on public.community_comments;
create policy community_comments_delete_own
on public.community_comments
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists community_likes_insert_own on public.community_likes;
create policy community_likes_insert_own
on public.community_likes
for insert
with check (
  (
    ((select auth.uid()) is not null and user_id = (select auth.uid()))
    or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
  )
  and exists (
    select 1
    from public.community_posts p
    where p.id = community_likes.post_id
  )
);

drop policy if exists community_likes_update_own on public.community_likes;
create policy community_likes_update_own
on public.community_likes
for update
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
)
with check (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists community_likes_delete_own on public.community_likes;
create policy community_likes_delete_own
on public.community_likes
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
);

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own
on public.account_deletion_requests
for select
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists account_deletion_requests_insert_own on public.account_deletion_requests;
create policy account_deletion_requests_insert_own
on public.account_deletion_requests
for insert
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

drop policy if exists account_deletion_request_events_select_own on public.account_deletion_request_events;
create policy account_deletion_request_events_select_own
on public.account_deletion_request_events
for select
using (
  exists (
    select 1
    from public.account_deletion_requests r
    where r.id = account_deletion_request_events.request_id
      and (select auth.uid()) is not null
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists family_groups_select_member on public.family_groups;
create policy family_groups_select_member
on public.family_groups
for select
using (
  exists (
    select 1
    from public.family_members m
    where m.family_group_id = family_groups.id
      and (
        ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
        or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
      )
  )
);

drop policy if exists family_groups_insert_owner on public.family_groups;
create policy family_groups_insert_owner
on public.family_groups
for insert
with check (
  ((select auth.uid()) is not null and owner_user_id = (select auth.uid()))
  or ((select auth.uid()) is null and owner_user_id is null and owner_device_id = (select app.current_device_id()))
);

drop policy if exists family_groups_update_owner on public.family_groups;
create policy family_groups_update_owner
on public.family_groups
for update
using (
  ((select auth.uid()) is not null and owner_user_id = (select auth.uid()))
  or ((select auth.uid()) is null and owner_user_id is null and owner_device_id = (select app.current_device_id()))
)
with check (
  ((select auth.uid()) is not null and owner_user_id = (select auth.uid()))
  or ((select auth.uid()) is null and owner_user_id is null and owner_device_id = (select app.current_device_id()))
);

drop policy if exists family_members_select_same_group on public.family_members;
create policy family_members_select_same_group
on public.family_members
for select
using (
  exists (
    select 1
    from public.family_members viewer
    where viewer.family_group_id = family_members.family_group_id
      and (
        ((select auth.uid()) is not null and viewer.user_id = (select auth.uid()))
        or ((select auth.uid()) is null and viewer.user_id is null and viewer.device_id = (select app.current_device_id()))
      )
  )
);

drop policy if exists family_members_insert_self_or_owner on public.family_members;
create policy family_members_insert_self_or_owner
on public.family_members
for insert
with check (
  (
    ((select auth.uid()) is not null and user_id = (select auth.uid()))
    or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
  )
  and (
    select count(*)
    from public.family_members m
    where m.family_group_id = family_members.family_group_id
  ) < 4
);

drop policy if exists family_members_delete_self_or_owner on public.family_members;
create policy family_members_delete_self_or_owner
on public.family_members
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
  or exists (
    select 1
    from public.family_groups g
    where g.id = family_members.family_group_id
      and (
        ((select auth.uid()) is not null and g.owner_user_id = (select auth.uid()))
        or ((select auth.uid()) is null and g.owner_user_id is null and g.owner_device_id = (select app.current_device_id()))
      )
  )
);

drop policy if exists community_images_insert_own_path on storage.objects;
create policy community_images_insert_own_path
on storage.objects
for insert
with check (
  bucket_id = 'community-images'
  and (
    (select auth.uid()) is not null
    or (select app.current_device_id()) is not null
  )
);
