-- 로그인 이전 게스트 디바이스 접근은 user_id가 없는 행에만 허용합니다.

drop policy if exists ingredients_select_own on public.ingredients;
create policy ingredients_select_own
on public.ingredients
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists ingredients_insert_own on public.ingredients;
create policy ingredients_insert_own
on public.ingredients
for insert
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists ingredients_update_own on public.ingredients;
create policy ingredients_update_own
on public.ingredients
for update
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists ingredients_delete_own on public.ingredients;
create policy ingredients_delete_own
on public.ingredients
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own
on public.favorites
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own
on public.favorites
for insert
with check (
  (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
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
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own
on public.favorites
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists shopping_items_select_own on public.shopping_items;
create policy shopping_items_select_own
on public.shopping_items
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists shopping_items_insert_own on public.shopping_items;
create policy shopping_items_insert_own
on public.shopping_items
for insert
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists shopping_items_update_own on public.shopping_items;
create policy shopping_items_update_own
on public.shopping_items
for update
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists shopping_items_delete_own on public.shopping_items;
create policy shopping_items_delete_own
on public.shopping_items
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own
on public.community_posts
for insert
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own
on public.community_posts
for update
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own
on public.community_posts
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists community_comments_insert_own on public.community_comments;
create policy community_comments_insert_own
on public.community_comments
for insert
with check (
  (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
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
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists community_comments_delete_own on public.community_comments;
create policy community_comments_delete_own
on public.community_comments
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists community_likes_insert_own on public.community_likes;
create policy community_likes_insert_own
on public.community_likes
for insert
with check (
  (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
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
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

drop policy if exists community_likes_delete_own on public.community_likes;
create policy community_likes_delete_own
on public.community_likes
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
);

do $$
declare
  unhardened_device_policies text[];
begin
  select array_agg(tablename || '.' || policyname) into unhardened_device_policies
  from pg_policies pol
  where pol.schemaname = 'public'
    and pol.tablename in (
      'ingredients',
      'favorites',
      'shopping_items',
      'community_posts',
      'community_comments',
      'community_likes'
    )
    and (
      (
        lower(coalesce(pol.qual, '')) like '%current_device_id%'
        and (
          lower(coalesce(pol.qual, '')) not like '%user_id is null%'
          or lower(coalesce(pol.qual, '')) not like '%auth.uid() is null%'
        )
      )
      or (
        lower(coalesce(pol.with_check, '')) like '%current_device_id%'
        and (
          lower(coalesce(pol.with_check, '')) not like '%user_id is null%'
          or lower(coalesce(pol.with_check, '')) not like '%auth.uid() is null%'
        )
      )
    );

  if unhardened_device_policies is not null and coalesce(array_length(unhardened_device_policies, 1), 0) > 0 then
    raise exception '디바이스 폴백 정책의 게스트/user_id is null 검증 실패: %', array_to_string(unhardened_device_policies, ', ');
  end if;
end
$$;
