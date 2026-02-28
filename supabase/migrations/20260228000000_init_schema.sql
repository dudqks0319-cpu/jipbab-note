-- 집밥노트 Supabase 테이블 및 RLS 정책을 생성하는 스키마입니다.

create extension if not exists pgcrypto;

create schema if not exists app;
grant usage on schema app to anon, authenticated;

-- 요청 헤더/토큰에서 디바이스 ID를 읽기 위한 함수입니다.
create or replace function app.request_header(header_name text)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> lower(header_name),
    nullif(current_setting('request.headers', true), '')::jsonb ->> header_name
  );
$$;

create or replace function app.current_device_id()
returns text
language sql
stable
as $$
  select nullif(coalesce(auth.jwt() ->> 'device_id', app.request_header('x-device-id')), '');
$$;

-- updated_at 자동 갱신 함수입니다.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 재료 테이블입니다.
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  name text not null,
  category text,
  storage_type text not null default '냉장',
  quantity text,
  expiry_date date,
  barcode text,
  image_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 레시피 테이블입니다.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  difficulty int check (difficulty is null or difficulty between 1 and 3),
  cooking_time int,
  servings int,
  thumbnail_url text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source text,
  created_at timestamptz not null default now()
);

-- 즐겨찾기 테이블입니다.
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 커뮤니티 게시글 테이블입니다.
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  author_name text not null default '익명 집밥러',
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 커뮤니티 댓글 테이블입니다.
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  device_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  author_name text not null default '익명 집밥러',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 커뮤니티 좋아요 테이블입니다.
create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  device_id text,
  user_id uuid null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingredients_device_id on public.ingredients(device_id);
create index if not exists idx_ingredients_user_id on public.ingredients(user_id);
create index if not exists idx_ingredients_expiry_date on public.ingredients(expiry_date);

create index if not exists idx_recipes_category on public.recipes(category);
create index if not exists idx_recipes_difficulty on public.recipes(difficulty);

create index if not exists idx_favorites_device_id on public.favorites(device_id);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_recipe_id on public.favorites(recipe_id);

create index if not exists idx_community_posts_device_id on public.community_posts(device_id);
create index if not exists idx_community_posts_user_id on public.community_posts(user_id);
create index if not exists idx_community_posts_created_at on public.community_posts(created_at desc);

create index if not exists idx_community_comments_post_id on public.community_comments(post_id);
create index if not exists idx_community_comments_device_id on public.community_comments(device_id);
create index if not exists idx_community_comments_user_id on public.community_comments(user_id);
create index if not exists idx_community_comments_created_at on public.community_comments(created_at asc);

create index if not exists idx_community_likes_post_id on public.community_likes(post_id);
create index if not exists idx_community_likes_device_id on public.community_likes(device_id);
create index if not exists idx_community_likes_user_id on public.community_likes(user_id);

create unique index if not exists favorites_user_recipe_unique
on public.favorites(user_id, recipe_id)
where user_id is not null;

create unique index if not exists favorites_device_recipe_unique
on public.favorites(device_id, recipe_id)
where user_id is null and device_id is not null;

create unique index if not exists community_likes_user_post_unique
on public.community_likes(user_id, post_id)
where user_id is not null;

create unique index if not exists community_likes_device_post_unique
on public.community_likes(device_id, post_id)
where user_id is null and device_id is not null;

alter table public.favorites alter column device_id set not null;
alter table public.community_posts alter column author_name set default '익명 집밥러';
alter table public.community_comments alter column author_name set default '익명 집밥러';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_ingredients_updated_at'
      and tgrelid = 'public.ingredients'::regclass
  ) then
    create trigger set_ingredients_updated_at
    before update on public.ingredients
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_community_posts_updated_at'
      and tgrelid = 'public.community_posts'::regclass
  ) then
    create trigger set_community_posts_updated_at
    before update on public.community_posts
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_community_comments_updated_at'
      and tgrelid = 'public.community_comments'::regclass
  ) then
    create trigger set_community_comments_updated_at
    before update on public.community_comments
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.ingredients enable row level security;
alter table public.favorites enable row level security;
alter table public.recipes enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;

drop policy if exists ingredients_select_own on public.ingredients;
create policy ingredients_select_own
on public.ingredients
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists ingredients_insert_own on public.ingredients;
create policy ingredients_insert_own
on public.ingredients
for insert
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists ingredients_update_own on public.ingredients;
create policy ingredients_update_own
on public.ingredients
for update
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists ingredients_delete_own on public.ingredients;
create policy ingredients_delete_own
on public.ingredients
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own
on public.favorites
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own
on public.favorites
for insert
with check (
  (
    (auth.uid() is not null and user_id = auth.uid())
    or (device_id = app.current_device_id())
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
  or (device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own
on public.favorites
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists recipes_select_public on public.recipes;
create policy recipes_select_public
on public.recipes
for select
using (true);

drop policy if exists recipes_insert_service_role on public.recipes;
create policy recipes_insert_service_role
on public.recipes
for insert
to service_role
with check (true);

drop policy if exists recipes_update_service_role on public.recipes;
create policy recipes_update_service_role
on public.recipes
for update
to service_role
using (true)
with check (true);

drop policy if exists recipes_delete_service_role on public.recipes;
create policy recipes_delete_service_role
on public.recipes
for delete
to service_role
using (true);

drop policy if exists community_posts_select_public on public.community_posts;
create policy community_posts_select_public
on public.community_posts
for select
using (true);

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own
on public.community_posts
for insert
with check (true);

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own
on public.community_posts
for update
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own
on public.community_posts
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists community_comments_select_public on public.community_comments;
create policy community_comments_select_public
on public.community_comments
for select
using (true);

drop policy if exists community_comments_insert_own on public.community_comments;
create policy community_comments_insert_own
on public.community_comments
for insert
with check (
  true
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
  or (device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists community_comments_delete_own on public.community_comments;
create policy community_comments_delete_own
on public.community_comments
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists community_likes_select_public on public.community_likes;
create policy community_likes_select_public
on public.community_likes
for select
using (true);

drop policy if exists community_likes_insert_own on public.community_likes;
create policy community_likes_insert_own
on public.community_likes
for insert
with check (
  true
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
  or (device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists community_likes_delete_own on public.community_likes;
create policy community_likes_delete_own
on public.community_likes
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);
