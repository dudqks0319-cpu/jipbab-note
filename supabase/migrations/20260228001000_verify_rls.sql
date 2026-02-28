-- 원격 DB 스키마 적용 결과(테이블/RLS/정책)를 검증합니다.
do $$
declare
  missing_tables text[];
  rls_off_tables text[];
  missing_policies text[];
  expected_tables text[] := array[
    'ingredients',
    'recipes',
    'favorites',
    'community_posts',
    'community_comments',
    'community_likes'
  ];
  expected_policies text[] := array[
    'ingredients.ingredients_select_own',
    'ingredients.ingredients_insert_own',
    'ingredients.ingredients_update_own',
    'ingredients.ingredients_delete_own',

    'recipes.recipes_select_public',
    'recipes.recipes_insert_service_role',
    'recipes.recipes_update_service_role',
    'recipes.recipes_delete_service_role',

    'favorites.favorites_select_own',
    'favorites.favorites_insert_own',
    'favorites.favorites_update_own',
    'favorites.favorites_delete_own',

    'community_posts.community_posts_select_public',
    'community_posts.community_posts_insert_own',
    'community_posts.community_posts_update_own',
    'community_posts.community_posts_delete_own',

    'community_comments.community_comments_select_public',
    'community_comments.community_comments_insert_own',
    'community_comments.community_comments_update_own',
    'community_comments.community_comments_delete_own',

    'community_likes.community_likes_select_public',
    'community_likes.community_likes_insert_own',
    'community_likes.community_likes_update_own',
    'community_likes.community_likes_delete_own'
  ];
begin
  select array_agg(t) into missing_tables
  from unnest(expected_tables) as t
  where not exists (
    select 1
    from information_schema.tables i
    where i.table_schema = 'public'
      and i.table_name = t
  );

  if missing_tables is not null and coalesce(array_length(missing_tables, 1), 0) > 0 then
    raise exception '누락 테이블: %', array_to_string(missing_tables, ', ');
  end if;

  select array_agg(t) into rls_off_tables
  from unnest(expected_tables) as t
  where not exists (
    select 1
    from pg_tables p
    where p.schemaname = 'public'
      and p.tablename = t
      and p.rowsecurity = true
  );

  if rls_off_tables is not null and coalesce(array_length(rls_off_tables, 1), 0) > 0 then
    raise exception 'RLS 미활성 테이블: %', array_to_string(rls_off_tables, ', ');
  end if;

  select array_agg(policy_name) into missing_policies
  from (
    select p as policy_name
    from unnest(expected_policies) as p
    where not exists (
      select 1
      from pg_policies pol
      where pol.schemaname = 'public'
        and (pol.tablename || '.' || pol.policyname) = p
    )
  ) q;

  if missing_policies is not null and coalesce(array_length(missing_policies, 1), 0) > 0 then
    raise exception '누락 정책: %', array_to_string(missing_policies, ', ');
  end if;

  if not exists (
    select 1
    from pg_policies pol
    where pol.schemaname = 'public'
      and pol.tablename = 'recipes'
      and pol.policyname in (
        'recipes_insert_service_role',
        'recipes_update_service_role',
        'recipes_delete_service_role'
      )
      and 'service_role' = any(pol.roles)
  ) then
    raise exception 'recipes 쓰기 정책의 service_role 권한 검증 실패';
  end if;

  raise notice 'RLS/정책 검증 통과';
end
$$;
