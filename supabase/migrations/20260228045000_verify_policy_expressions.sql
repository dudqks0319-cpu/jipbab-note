-- 커뮤니티 INSERT 정책 표현식이 완화(true)되지 않았는지 검증합니다.
do $$
declare
  posts_check text;
  comments_check text;
  likes_check text;
begin
  select with_check into posts_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'community_posts'
    and policyname = 'community_posts_insert_own';

  select with_check into comments_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'community_comments'
    and policyname = 'community_comments_insert_own';

  select with_check into likes_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'community_likes'
    and policyname = 'community_likes_insert_own';

  if posts_check is null or posts_check = 'true' then
    raise exception 'community_posts_insert_own 정책이 과도하게 완화되어 있습니다: %', coalesce(posts_check, 'NULL');
  end if;

  if comments_check is null or comments_check = 'true' then
    raise exception 'community_comments_insert_own 정책이 과도하게 완화되어 있습니다: %', coalesce(comments_check, 'NULL');
  end if;

  if likes_check is null or likes_check = 'true' then
    raise exception 'community_likes_insert_own 정책이 과도하게 완화되어 있습니다: %', coalesce(likes_check, 'NULL');
  end if;

  raise notice '커뮤니티 INSERT 정책 표현식 검증 통과';
end
$$;
