-- 커뮤니티 INSERT 정책을 디바이스/사용자 소유 검증 방식으로 강화합니다.
drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own
on public.community_posts
for insert
with check (
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
