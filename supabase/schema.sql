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
set search_path = pg_catalog
as $$
  select null::text;
$$;

revoke all on function app.current_device_id() from public;
revoke all on function app.current_device_id() from anon, authenticated;
revoke all on function app.request_header(text) from public;
revoke all on function app.request_header(text) from anon, authenticated;

create or replace function app.is_permanent_user()
returns boolean
language sql
stable
set search_path = pg_catalog, auth
as $$
  select
    (select auth.uid()) is not null
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false;
$$;

revoke all on function app.is_permanent_user() from public;
revoke all on function app.is_permanent_user() from anon;
grant execute on function app.is_permanent_user() to authenticated;

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

-- 가족 냉장고 공유 테이블입니다.
create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid null references auth.users(id) on delete set null,
  owner_device_id text not null,
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_groups_name_length check (char_length(name) between 1 and 40),
  constraint family_groups_invite_code_length check (char_length(invite_code) between 4 and 12)
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete cascade,
  device_id text not null,
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_members_role_allowed check (role in ('owner', 'member')),
  constraint family_members_display_name_length check (char_length(display_name) between 1 and 24)
);

-- 재료 테이블입니다.
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  family_group_id uuid null references public.family_groups(id) on delete cascade,
  name text not null,
  category text,
  storage_type text not null default '냉장',
  quantity text,
  expiry_date date,
  purchase_date date,
  opened_at timestamptz,
  storage_location text,
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  purchase_place text,
  consumed_at timestamptz,
  discarded_at timestamptz,
  repeat_purchase boolean not null default false,
  barcode text,
  image_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingredients_name_length'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_name_length
      check (char_length(name) between 1 and 120)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingredients_storage_type_allowed'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_storage_type_allowed
      check (storage_type in ('냉장', '냉동', '실온'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingredients_text_field_lengths'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_text_field_lengths
      check (
        (category is null or char_length(category) <= 40)
        and (quantity is null or char_length(quantity) <= 80)
        and (barcode is null or char_length(barcode) <= 80)
        and (image_url is null or char_length(image_url) <= 2048)
        and (memo is null or char_length(memo) <= 500)
        and (storage_location is null or char_length(storage_location) <= 80)
        and (purchase_place is null or char_length(purchase_place) <= 120)
      )
      not valid;
  end if;
end $$;

-- 레시피 테이블입니다.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  difficulty int check (difficulty is null or difficulty between 1 and 3),
  cooking_time int,
  servings int,
  servings_base int check (servings_base is null or servings_base > 0),
  prep_time_minutes int check (prep_time_minutes is null or prep_time_minutes >= 0),
  cook_time_minutes int check (cook_time_minutes is null or cook_time_minutes > 0),
  total_time_minutes int check (total_time_minutes is null or total_time_minutes > 0),
  thumbnail_url text,
  tools jsonb not null default '[]'::jsonb check (jsonb_typeof(tools) = 'array'),
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  storage_guide text,
  reheating_guide text,
  safety_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(safety_notes) = 'array'),
  source_id uuid,
  content_origin text check (content_origin is null or content_origin in ('original', 'public_api', 'licensed', 'user_bookmark')),
  reviewed_for_beginner boolean not null default false,
  review_status text not null default 'imported' check (review_status in ('imported', 'normalizing', 'editorial_review', 'beginner_review', 'cooking_test', 'approved', 'needs_revision', 'rejected', 'archived')),
  beginner_reviewed_at timestamptz,
  actual_cooking_tested boolean not null default false,
  actual_cooking_tested_at timestamptz,
  food_safety_reviewed boolean not null default false,
  food_safety_reviewed_at timestamptz,
  image_rights_status text not null default 'unverified' check (image_rights_status in ('unverified', 'approved', 'no_image_approved', 'rejected')),
  image_rights_reviewed_at timestamptz,
  source_reviewed_at timestamptz,
  reviewer text,
  published_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text,
  title text not null,
  source_url text,
  license text not null,
  attribution text not null,
  raw_payload jsonb,
  imported_at timestamptz not null default now(),
  unique (provider, external_id)
);

alter table public.recipes
drop constraint if exists recipes_source_id_fkey;

alter table public.recipes
add constraint recipes_source_id_fkey
foreign key (source_id) references public.recipe_sources(id);

-- 즐겨찾기 테이블입니다.
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 장보기 테이블입니다.
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid null references auth.users(id) on delete cascade,
  family_group_id uuid null references public.family_groups(id) on delete cascade,
  name text not null,
  quantity text,
  category text,
  checked boolean not null default false,
  source_recipe_id text,
  source_recipe_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- 레시피 댓글 테이블입니다.
create table if not exists public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null,
  device_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  author_name text not null default '집밥러',
  content text not null,
  status text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_comments_content_length
    check (char_length(content) between 1 and 500),
  constraint recipe_comments_status_allowed
    check (status in ('visible', 'hidden', 'deleted'))
);

-- 커뮤니티 좋아요 테이블입니다.
create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  device_id text,
  user_id uuid null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  reason text,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.account_deletion_requests(id) on delete cascade,
  actor_email text,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists family_members_user_group_unique
on public.family_members(family_group_id, user_id)
where user_id is not null;

create unique index if not exists family_members_device_group_unique
on public.family_members(family_group_id, device_id)
where user_id is null;

create index if not exists idx_family_groups_owner_user_id on public.family_groups(owner_user_id);
create index if not exists idx_family_groups_owner_device_id on public.family_groups(owner_device_id);
create index if not exists idx_family_groups_invite_code on public.family_groups(invite_code);
create index if not exists idx_family_members_family_group_id on public.family_members(family_group_id);
create index if not exists idx_family_members_user_id on public.family_members(user_id);
create index if not exists idx_family_members_device_id on public.family_members(device_id);

create index if not exists idx_ingredients_device_id on public.ingredients(device_id);
create index if not exists idx_ingredients_user_id on public.ingredients(user_id);
create index if not exists idx_ingredients_family_group_id on public.ingredients(family_group_id);
create index if not exists idx_ingredients_expiry_date on public.ingredients(expiry_date);

create index if not exists idx_recipes_category on public.recipes(category);
create index if not exists idx_recipes_difficulty on public.recipes(difficulty);
create index if not exists idx_recipes_source_id on public.recipes(source_id);

create index if not exists idx_recipes_publication_ready
on public.recipes (published_at desc, created_at desc)
where review_status = 'approved'
  and reviewed_for_beginner is true
  and actual_cooking_tested is true
  and food_safety_reviewed is true
  and published_at is not null;
create index if not exists idx_recipes_content_origin on public.recipes(content_origin);
create index if not exists idx_recipe_sources_provider_external_id on public.recipe_sources(provider, external_id);

create index if not exists idx_favorites_device_id on public.favorites(device_id);
create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_recipe_id on public.favorites(recipe_id);

create index if not exists idx_shopping_items_device_id on public.shopping_items(device_id);
create index if not exists idx_shopping_items_user_id on public.shopping_items(user_id);
create index if not exists idx_shopping_items_family_group_id on public.shopping_items(family_group_id);
create index if not exists idx_shopping_items_checked on public.shopping_items(checked);
create index if not exists idx_shopping_items_created_at on public.shopping_items(created_at desc);

create index if not exists idx_community_posts_device_id on public.community_posts(device_id);
create index if not exists idx_community_posts_user_id on public.community_posts(user_id);
create index if not exists idx_community_posts_created_at on public.community_posts(created_at desc);

create index if not exists idx_community_comments_post_id on public.community_comments(post_id);
create index if not exists idx_community_comments_device_id on public.community_comments(device_id);
create index if not exists idx_community_comments_user_id on public.community_comments(user_id);
create index if not exists idx_community_comments_created_at on public.community_comments(created_at asc);

create index if not exists idx_recipe_comments_recipe_id on public.recipe_comments(recipe_id, created_at desc);
create index if not exists idx_recipe_comments_user_id on public.recipe_comments(user_id);
create index if not exists idx_recipe_comments_status on public.recipe_comments(status);

create index if not exists idx_community_likes_post_id on public.community_likes(post_id);
create index if not exists idx_community_likes_device_id on public.community_likes(device_id);
create index if not exists idx_community_likes_user_id on public.community_likes(user_id);

create index if not exists idx_account_deletion_requests_user_id on public.account_deletion_requests(user_id);
create index if not exists idx_account_deletion_requests_status on public.account_deletion_requests(status);
create index if not exists idx_account_deletion_request_events_request_id on public.account_deletion_request_events(request_id);

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

create unique index if not exists account_deletion_requests_open_unique
on public.account_deletion_requests(user_id)
where status = 'requested';

alter table public.favorites alter column device_id set not null;
alter table public.community_posts alter column author_name set default '익명 집밥러';
alter table public.community_comments alter column author_name set default '익명 집밥러';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_family_groups_updated_at'
      and tgrelid = 'public.family_groups'::regclass
  ) then
    create trigger set_family_groups_updated_at
    before update on public.family_groups
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_family_members_updated_at'
      and tgrelid = 'public.family_members'::regclass
  ) then
    create trigger set_family_members_updated_at
    before update on public.family_members
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
    where tgname = 'set_shopping_items_updated_at'
      and tgrelid = 'public.shopping_items'::regclass
  ) then
    create trigger set_shopping_items_updated_at
    before update on public.shopping_items
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

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_recipe_comments_updated_at'
      and tgrelid = 'public.recipe_comments'::regclass
  ) then
    create trigger set_recipe_comments_updated_at
    before update on public.recipe_comments
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.ingredients enable row level security;
alter table public.favorites enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_sources enable row level security;
alter table public.shopping_items enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.recipe_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_request_events enable row level security;

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

drop policy if exists ingredients_select_own on public.ingredients;
create policy ingredients_select_own
on public.ingredients
for select
using (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = ingredients.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
);

drop policy if exists ingredients_insert_own on public.ingredients;
create policy ingredients_insert_own
on public.ingredients
for insert
with check (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = ingredients.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
);

drop policy if exists ingredients_update_own on public.ingredients;
create policy ingredients_update_own
on public.ingredients
for update
using (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = ingredients.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
)
with check (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = ingredients.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
);

drop policy if exists ingredients_delete_own on public.ingredients;
create policy ingredients_delete_own
on public.ingredients
for delete
using (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = ingredients.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
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
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = shopping_items.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
);

drop policy if exists shopping_items_insert_own on public.shopping_items;
create policy shopping_items_insert_own
on public.shopping_items
for insert
with check (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = shopping_items.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
);

drop policy if exists shopping_items_update_own on public.shopping_items;
create policy shopping_items_update_own
on public.shopping_items
for update
using (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = shopping_items.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
)
with check (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = shopping_items.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
);

drop policy if exists shopping_items_delete_own on public.shopping_items;
create policy shopping_items_delete_own
on public.shopping_items
for delete
using (
  (
    family_group_id is null
    and (
      ((select auth.uid()) is not null and user_id = (select auth.uid()))
      or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
    )
  )
  or (
    family_group_id is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = shopping_items.family_group_id
        and (
          ((select auth.uid()) is not null and m.user_id = (select auth.uid()))
          or ((select auth.uid()) is null and m.user_id is null and m.device_id = (select app.current_device_id()))
        )
    )
  )
);

drop policy if exists recipes_select_public on public.recipes;
create policy recipes_select_public
on public.recipes
for select
to anon, authenticated
using (
  review_status = 'approved'
  and reviewed_for_beginner is true
  and beginner_reviewed_at is not null
  and actual_cooking_tested is true
  and actual_cooking_tested_at is not null
  and food_safety_reviewed is true
  and food_safety_reviewed_at is not null
  and image_rights_status in ('approved', 'no_image_approved')
  and image_rights_reviewed_at is not null
  and source_reviewed_at is not null
  and published_at is not null
  and reviewer is not null
  and btrim(reviewer) <> ''
  and source_id is not null
  and title is not null
  and btrim(title) <> ''
  and description is not null
  and btrim(description) <> ''
  and category is not null
  and btrim(category) <> ''
  and difficulty between 1 and 3
  and servings_base > 0
  and prep_time_minutes >= 0
  and cook_time_minutes > 0
  and total_time_minutes >= prep_time_minutes + cook_time_minutes
  and jsonb_typeof(tools) = 'array'
  and jsonb_array_length(tools) >= 1
  and not exists (
    select 1
    from jsonb_array_elements(tools) as tool(value)
    where not (
      (jsonb_typeof(tool.value) = 'string' and btrim(tool.value #>> '{}') <> '')
      or (
        jsonb_typeof(tool.value) = 'object'
        and nullif(btrim(tool.value ->> 'name'), '') is not null
      )
    )
  )
  and jsonb_typeof(ingredients) = 'array'
  and jsonb_array_length(ingredients) >= 3
  and not exists (
    select 1
    from jsonb_array_elements(ingredients) as ingredient(value)
    where jsonb_typeof(ingredient.value) <> 'object'
      or nullif(btrim(ingredient.value ->> 'name'), '') is null
      or nullif(
        btrim(coalesce(
          ingredient.value ->> 'amount',
          ingredient.value ->> 'quantityText',
          ingredient.value ->> 'quantity_text'
        )),
        ''
      ) is null
  )
  and jsonb_typeof(steps) = 'array'
  and jsonb_array_length(steps) >= 3
  and not exists (
    select 1
    from jsonb_array_elements(steps) as step(value)
    where jsonb_typeof(step.value) <> 'object'
      or nullif(btrim(coalesce(
        step.value ->> 'instruction',
        step.value ->> 'description',
        step.value ->> 'action'
      )), '') is null
      or nullif(btrim(coalesce(
        step.value ->> 'heatLevel',
        step.value ->> 'heat_level',
        step.value ->> 'heat'
      )), '') is null
      or nullif(btrim(coalesce(
        step.value ->> 'visualCue',
        step.value ->> 'visual_cue'
      )), '') is null
      or coalesce(
        nullif(btrim(step.value ->> 'minutes'), ''),
        nullif(btrim(step.value ->> 'durationSecondsMin'), ''),
        nullif(btrim(step.value ->> 'duration_seconds_min'), ''),
        nullif(btrim(step.value ->> 'timerPresetSeconds'), ''),
        nullif(btrim(step.value ->> 'timer_preset_seconds'), ''),
        ''
      ) !~ '^[0-9]+([.][0-9]+)?$'
  )
  and storage_guide is not null
  and btrim(storage_guide) <> ''
  and reheating_guide is not null
  and btrim(reheating_guide) <> ''
  and (
    image_rights_status = 'no_image_approved'
    or (thumbnail_url is not null and btrim(thumbnail_url) <> '')
  )
);

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

drop policy if exists recipe_sources_select_public on public.recipe_sources;
create policy recipe_sources_select_public
on public.recipe_sources
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.recipes
    where recipes.source_id = recipe_sources.id
  )
);

drop policy if exists recipe_sources_insert_service_role on public.recipe_sources;
create policy recipe_sources_insert_service_role
on public.recipe_sources
for insert
to service_role
with check (true);

drop policy if exists recipe_sources_update_service_role on public.recipe_sources;
create policy recipe_sources_update_service_role
on public.recipe_sources
for update
to service_role
using (true)
with check (true);

drop policy if exists recipe_sources_delete_service_role on public.recipe_sources;
create policy recipe_sources_delete_service_role
on public.recipe_sources
for delete
to service_role
using (true);

drop policy if exists recipe_comments_select_visible on public.recipe_comments;
create policy recipe_comments_select_visible
on public.recipe_comments
for select
using (status = 'visible');

drop policy if exists recipe_comments_insert_authenticated on public.recipe_comments;
create policy recipe_comments_insert_authenticated
on public.recipe_comments
for insert
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and status = 'visible'
  and char_length(content) between 1 and 500
);

drop policy if exists recipe_comments_update_own on public.recipe_comments;
create policy recipe_comments_update_own
on public.recipe_comments
for update
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and status in ('visible', 'hidden', 'deleted')
  and char_length(content) between 1 and 500
);

drop policy if exists recipe_comments_delete_own on public.recipe_comments;
create policy recipe_comments_delete_own
on public.recipe_comments
for delete
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

drop policy if exists community_posts_select_public on public.community_posts;
create policy community_posts_select_public
on public.community_posts
for select
using (true);

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

drop policy if exists community_images_select_public on storage.objects;
create policy community_images_select_public
on storage.objects
for select
using (bucket_id = 'community-images');

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

create or replace function app.current_device_id()
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select null::text;
$$;

revoke all on function app.current_device_id() from public;
revoke all on function app.current_device_id() from anon, authenticated;
revoke all on function app.request_header(text) from public;
revoke all on function app.request_header(text) from anon, authenticated;

create or replace function app.is_permanent_user()
returns boolean
language sql
stable
set search_path = pg_catalog, auth
as $$
  select
    (select auth.uid()) is not null
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false;
$$;

revoke all on function app.is_permanent_user() from public;
revoke all on function app.is_permanent_user() from anon;
grant execute on function app.is_permanent_user() to authenticated;

create or replace function public.is_current_family_member(group_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app, auth, pg_temp
as $$
  select
    app.is_permanent_user()
    and group_id_input is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = group_id_input
        and m.user_id = (select auth.uid())
    );
$$;

create or replace function public.is_current_family_group_owner(group_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app, auth, pg_temp
as $$
  select
    app.is_permanent_user()
    and group_id_input is not null
    and exists (
      select 1
      from public.family_groups g
      where g.id = group_id_input
        and g.owner_user_id = (select auth.uid())
    );
$$;

create or replace function public.family_group_member_count(group_id_input uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.family_members m
  where m.family_group_id = group_id_input;
$$;

revoke all on function public.is_current_family_member(uuid) from public;
revoke all on function public.is_current_family_member(uuid) from anon;
revoke all on function public.is_current_family_group_owner(uuid) from public;
revoke all on function public.is_current_family_group_owner(uuid) from anon;
revoke all on function public.family_group_member_count(uuid) from public;
revoke all on function public.family_group_member_count(uuid) from anon;
revoke all on function public.family_group_member_count(uuid) from authenticated;
grant execute on function public.is_current_family_member(uuid) to authenticated;
grant execute on function public.is_current_family_group_owner(uuid) to authenticated;

create or replace function public.create_family_group(
  group_id_input uuid,
  group_name_input text,
  invite_code_input text,
  owner_display_name_input text
)
returns table (
  group_id uuid,
  group_name text,
  invite_code text,
  owner_name text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, auth, pg_temp
as $$
declare
  acting_user_id uuid := (select auth.uid());
  legacy_device_id text := 'signed:' || gen_random_uuid()::text;
  normalized_group_name text := left(trim(coalesce(group_name_input, '')), 40);
  normalized_invite_code text := upper(trim(coalesce(invite_code_input, '')));
  normalized_owner_name text := left(trim(coalesce(owner_display_name_input, '')), 24);
  inserted_created_at timestamptz;
  inserted_updated_at timestamptz;
begin
  if not app.is_permanent_user() then
    raise exception 'permanent_user_required';
  end if;
  if group_id_input is null then
    raise exception 'invalid_family_group_id';
  end if;
  if length(normalized_group_name) = 0 then
    normalized_group_name := '우리 가족 냉장고';
  end if;
  if length(normalized_owner_name) = 0 then
    normalized_owner_name := '나';
  end if;
  if normalized_invite_code !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.family_groups (
    id, owner_user_id, owner_device_id, name, invite_code
  ) values (
    group_id_input, acting_user_id, legacy_device_id, normalized_group_name, normalized_invite_code
  )
  returning family_groups.created_at, family_groups.updated_at
  into inserted_created_at, inserted_updated_at;

  insert into public.family_members (
    family_group_id, user_id, device_id, display_name, role
  ) values (
    group_id_input, acting_user_id, legacy_device_id, normalized_owner_name, 'owner'
  );

  group_id := group_id_input;
  group_name := normalized_group_name;
  invite_code := normalized_invite_code;
  owner_name := normalized_owner_name;
  created_at := inserted_created_at;
  updated_at := inserted_updated_at;
  return next;
end;
$$;

create or replace function public.join_family_group_by_invite_code(
  invite_code_input text,
  display_name_input text
)
returns table (
  group_id uuid,
  group_name text,
  invite_code text,
  owner_name text,
  member_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, auth, pg_temp
as $$
declare
  acting_user_id uuid := (select auth.uid());
  normalized_invite_code text := upper(trim(coalesce(invite_code_input, '')));
  normalized_display_name text := left(trim(coalesce(display_name_input, '')), 24);
  matched_group public.family_groups%rowtype;
  existing_member_id uuid;
  existing_member_role text;
  current_member_count integer;
  owner_display_name text;
begin
  if not app.is_permanent_user() then
    raise exception 'permanent_user_required';
  end if;
  if length(normalized_display_name) = 0 then
    normalized_display_name := '가족';
  end if;
  if normalized_invite_code !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'invalid_invite_code';
  end if;

  select * into matched_group
  from public.family_groups
  where family_groups.invite_code = normalized_invite_code
  for update;
  if not found then
    raise exception 'invalid_invite_code';
  end if;

  select m.id, m.role
  into existing_member_id, existing_member_role
  from public.family_members m
  where m.family_group_id = matched_group.id
    and m.user_id = acting_user_id
  limit 1;

  if existing_member_id is null then
    select count(*)::integer into current_member_count
    from public.family_members m
    where m.family_group_id = matched_group.id;
    if current_member_count >= 4 then
      raise exception 'family_group_full';
    end if;

    insert into public.family_members (
      family_group_id, user_id, device_id, display_name, role
    ) values (
      matched_group.id,
      acting_user_id,
      'signed:' || gen_random_uuid()::text,
      normalized_display_name,
      'member'
    );
  else
    update public.family_members
    set display_name = normalized_display_name,
        role = coalesce(existing_member_role, 'member'),
        updated_at = now()
    where id = existing_member_id;
  end if;

  select owner.display_name into owner_display_name
  from public.family_members owner
  where owner.family_group_id = matched_group.id
    and owner.role = 'owner'
  order by owner.created_at asc
  limit 1;

  select count(*)::integer into member_count
  from public.family_members m
  where m.family_group_id = matched_group.id;

  group_id := matched_group.id;
  group_name := matched_group.name;
  invite_code := matched_group.invite_code;
  owner_name := coalesce(owner_display_name, '가족');
  created_at := matched_group.created_at;
  updated_at := matched_group.updated_at;
  return next;
end;
$$;

create or replace function public.get_family_group_members(group_id_input uuid)
returns table (
  member_id uuid,
  device_id text,
  display_name text,
  role text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, auth, pg_temp
as $$
begin
  if not public.is_current_family_member(group_id_input) then
    raise exception 'family_group_access_denied';
  end if;

  return query
  select m.id, m.device_id, m.display_name, m.role, m.created_at
  from public.family_members m
  where m.family_group_id = group_id_input
  order by m.created_at asc;
end;
$$;

revoke all on function public.create_family_group(uuid, text, text, text) from public;
revoke all on function public.create_family_group(uuid, text, text, text) from anon;
revoke all on function public.join_family_group_by_invite_code(text, text) from public;
revoke all on function public.join_family_group_by_invite_code(text, text) from anon;
revoke all on function public.get_family_group_members(uuid) from public;
revoke all on function public.get_family_group_members(uuid) from anon;
grant execute on function public.create_family_group(uuid, text, text, text) to authenticated;
grant execute on function public.join_family_group_by_invite_code(text, text) to authenticated;
grant execute on function public.get_family_group_members(uuid) to authenticated;

drop policy if exists family_groups_select_member on public.family_groups;
create policy family_groups_select_member on public.family_groups
for select to authenticated
using (public.is_current_family_member(id));

drop policy if exists family_groups_insert_owner on public.family_groups;
create policy family_groups_insert_owner on public.family_groups
for insert to authenticated
with check (app.is_permanent_user() and owner_user_id = (select auth.uid()));

drop policy if exists family_groups_update_owner on public.family_groups;
create policy family_groups_update_owner on public.family_groups
for update to authenticated
using (public.is_current_family_group_owner(id))
with check (app.is_permanent_user() and owner_user_id = (select auth.uid()));

drop policy if exists family_members_select_same_group on public.family_members;
create policy family_members_select_same_group on public.family_members
for select to authenticated
using (public.is_current_family_member(family_group_id));

drop policy if exists family_members_insert_self_or_owner on public.family_members;
create policy family_members_insert_self_or_owner on public.family_members
for insert to authenticated
with check (
  app.is_permanent_user()
  and user_id = (select auth.uid())
  and role = 'owner'
  and public.is_current_family_group_owner(family_group_id)
);

drop policy if exists family_members_delete_self_or_owner on public.family_members;
create policy family_members_delete_self_or_owner on public.family_members
for delete to authenticated
using (
  app.is_permanent_user()
  and (
    user_id = (select auth.uid())
    or public.is_current_family_group_owner(family_group_id)
  )
);

drop policy if exists ingredients_select_own on public.ingredients;
create policy ingredients_select_own on public.ingredients
for select to authenticated
using (
  (family_group_id is null and user_id = (select auth.uid()))
  or (family_group_id is not null and public.is_current_family_member(ingredients.family_group_id))
);

drop policy if exists ingredients_insert_own on public.ingredients;
create policy ingredients_insert_own on public.ingredients
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(ingredients.family_group_id)
    )
  )
);

drop policy if exists ingredients_update_own on public.ingredients;
create policy ingredients_update_own on public.ingredients
for update to authenticated
using (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(ingredients.family_group_id)
    )
  )
)
with check (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(ingredients.family_group_id)
    )
  )
);

drop policy if exists ingredients_delete_own on public.ingredients;
create policy ingredients_delete_own on public.ingredients
for delete to authenticated
using (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(ingredients.family_group_id)
    )
  )
);

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.recipes r where r.id = favorites.recipe_id
  )
);

drop policy if exists favorites_update_own on public.favorites;
create policy favorites_update_own on public.favorites
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites
for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists shopping_items_select_own on public.shopping_items;
create policy shopping_items_select_own on public.shopping_items
for select to authenticated
using (
  (family_group_id is null and user_id = (select auth.uid()))
  or (family_group_id is not null and public.is_current_family_member(shopping_items.family_group_id))
);

drop policy if exists shopping_items_insert_own on public.shopping_items;
create policy shopping_items_insert_own on public.shopping_items
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(shopping_items.family_group_id)
    )
  )
);

drop policy if exists shopping_items_update_own on public.shopping_items;
create policy shopping_items_update_own on public.shopping_items
for update to authenticated
using (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(shopping_items.family_group_id)
    )
  )
)
with check (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(shopping_items.family_group_id)
    )
  )
);

drop policy if exists shopping_items_delete_own on public.shopping_items;
create policy shopping_items_delete_own on public.shopping_items
for delete to authenticated
using (
  user_id = (select auth.uid())
  and (
    family_group_id is null
    or (
      family_group_id is not null
      and public.is_current_family_member(shopping_items.family_group_id)
    )
  )
);

drop policy if exists recipe_comments_insert_authenticated on public.recipe_comments;
create policy recipe_comments_insert_authenticated on public.recipe_comments
for insert to authenticated
with check (
  app.is_permanent_user()
  and user_id = (select auth.uid())
  and status = 'visible'
  and char_length(content) between 1 and 500
);

drop policy if exists recipe_comments_update_own on public.recipe_comments;
create policy recipe_comments_update_own on public.recipe_comments
for update to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()))
with check (
  app.is_permanent_user()
  and user_id = (select auth.uid())
  and status in ('visible', 'hidden', 'deleted')
  and char_length(content) between 1 and 500
);

drop policy if exists recipe_comments_delete_own on public.recipe_comments;
create policy recipe_comments_delete_own on public.recipe_comments
for delete to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts
for insert to authenticated
with check (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own on public.community_posts
for update to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()))
with check (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own on public.community_posts
for delete to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists community_comments_insert_own on public.community_comments;
create policy community_comments_insert_own on public.community_comments
for insert to authenticated
with check (
  app.is_permanent_user()
  and user_id = (select auth.uid())
  and exists (select 1 from public.community_posts p where p.id = community_comments.post_id)
);

drop policy if exists community_comments_update_own on public.community_comments;
create policy community_comments_update_own on public.community_comments
for update to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()))
with check (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists community_comments_delete_own on public.community_comments;
create policy community_comments_delete_own on public.community_comments
for delete to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists community_likes_insert_own on public.community_likes;
create policy community_likes_insert_own on public.community_likes
for insert to authenticated
with check (
  app.is_permanent_user()
  and user_id = (select auth.uid())
  and exists (select 1 from public.community_posts p where p.id = community_likes.post_id)
);

drop policy if exists community_likes_update_own on public.community_likes;
create policy community_likes_update_own on public.community_likes
for update to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()))
with check (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists community_likes_delete_own on public.community_likes;
create policy community_likes_delete_own on public.community_likes
for delete to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own on public.account_deletion_requests
for select to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists account_deletion_requests_insert_own on public.account_deletion_requests;
create policy account_deletion_requests_insert_own on public.account_deletion_requests
for insert to authenticated
with check (app.is_permanent_user() and user_id = (select auth.uid()));

drop policy if exists account_deletion_request_events_select_own on public.account_deletion_request_events;
create policy account_deletion_request_events_select_own on public.account_deletion_request_events
for select to authenticated
using (
  app.is_permanent_user()
  and exists (
    select 1
    from public.account_deletion_requests r
    where r.id = account_deletion_request_events.request_id
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists community_images_insert_own_path on storage.objects;
create policy community_images_insert_own_path on storage.objects
for insert to authenticated
with check (
  bucket_id = 'community-images'
  and app.is_permanent_user()
  and name like ((select auth.uid())::text || '/%')
);

drop policy if exists community_images_update_own_path on storage.objects;
create policy community_images_update_own_path on storage.objects
for update to authenticated
using (
  bucket_id = 'community-images'
  and app.is_permanent_user()
  and name like ((select auth.uid())::text || '/%')
)
with check (
  bucket_id = 'community-images'
  and app.is_permanent_user()
  and name like ((select auth.uid())::text || '/%')
);

drop policy if exists community_images_delete_own_path on storage.objects;
create policy community_images_delete_own_path on storage.objects
for delete to authenticated
using (
  bucket_id = 'community-images'
  and app.is_permanent_user()
  and name like ((select auth.uid())::text || '/%')
);

create or replace function public.merge_anonymous_user_data(
  source_user_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if source_user_id is null or target_user_id is null or source_user_id = target_user_id then
    raise exception 'invalid_merge_identity';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = source_user_id and u.is_anonymous is true
  ) then
    raise exception 'source_must_be_anonymous';
  end if;
  if not exists (
    select 1 from auth.users u where u.id = target_user_id and u.is_anonymous is false
  ) then
    raise exception 'target_must_be_permanent';
  end if;

  delete from public.favorites source_row
  using public.favorites target_row
  where source_row.user_id = source_user_id
    and target_row.user_id = target_user_id
    and source_row.recipe_id = target_row.recipe_id;

  delete from public.community_likes source_row
  using public.community_likes target_row
  where source_row.user_id = source_user_id
    and target_row.user_id = target_user_id
    and source_row.post_id = target_row.post_id;

  update public.ingredients set user_id = target_user_id where user_id = source_user_id;
  update public.shopping_items set user_id = target_user_id where user_id = source_user_id;
  update public.favorites set user_id = target_user_id where user_id = source_user_id;
  update public.community_posts set user_id = target_user_id where user_id = source_user_id;
  update public.community_comments set user_id = target_user_id where user_id = source_user_id;
  update public.community_likes set user_id = target_user_id where user_id = source_user_id;
  update public.recipe_comments set user_id = target_user_id where user_id = source_user_id;
end;
$$;

revoke all on function public.merge_anonymous_user_data(uuid, uuid) from public;
revoke all on function public.merge_anonymous_user_data(uuid, uuid) from anon, authenticated;
grant execute on function public.merge_anonymous_user_data(uuid, uuid) to service_role;

do $$
declare
  unsafe_policies text[];
begin
  select array_agg(format('%I.%I', schemaname || '.' || tablename, policyname))
  into unsafe_policies
  from pg_policies
  where schemaname in ('public', 'storage')
    and (
      lower(coalesce(qual, '')) like '%current_device_id%'
      or lower(coalesce(with_check, '')) like '%current_device_id%'
      or lower(coalesce(qual, '')) like '%request_header%'
      or lower(coalesce(with_check, '')) like '%request_header%'
    );

  if unsafe_policies is not null then
    raise exception 'request-header authorization policy remains: %', array_to_string(unsafe_policies, ', ');
  end if;
end
$$;

-- PHASE1_RECIPE_V2_SCHEMA_START

create table if not exists public.recipe_categories (
  id text primary key,
  display_name text not null unique,
  sort_order integer not null check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_categories_id_format
    check (id ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint recipe_categories_display_name_length
    check (char_length(btrim(display_name)) between 1 and 40)
);

insert into public.recipe_categories (id, display_name, sort_order)
values
  ('rice', '밥·한 그릇', 10),
  ('soup', '국', 20),
  ('stew', '찌개·전골', 30),
  ('side', '반찬', 40),
  ('egg', '달걀', 50),
  ('tofu', '두부', 60),
  ('meat', '고기', 70),
  ('seafood', '해산물', 80),
  ('noodle', '면', 90),
  ('snack', '분식', 100),
  ('western', '양식', 110),
  ('chinese', '중식', 120),
  ('japanese', '일식', 130),
  ('dessert', '간식·디저트', 140),
  ('other', '기타', 150)
on conflict (id) do update
set display_name = excluded.display_name,
    sort_order = excluded.sort_order;

alter table public.recipes
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists category_id text references public.recipe_categories(id),
  add column if not exists cuisine_type text,
  add column if not exists schema_version smallint not null default 1,
  add column if not exists version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_slug_format'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_slug_format
      check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_phase1_field_lengths'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_phase1_field_lengths
      check (
        (summary is null or char_length(summary) <= 300)
        and (cuisine_type is null or char_length(cuisine_type) <= 40)
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_schema_version_allowed'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_schema_version_allowed
      check (schema_version in (1, 2));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recipes_version_positive'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_version_positive
      check (version > 0);
  end if;
end
$$;

create unique index if not exists idx_recipes_slug_unique
on public.recipes(slug)
where slug is not null;

create index if not exists idx_recipes_category_id
on public.recipes(category_id);

create index if not exists idx_recipes_schema_version
on public.recipes(schema_version, review_status);

create table if not exists public.ingredients_catalog (
  id text primary key,
  canonical_name text not null,
  category text not null,
  default_storage_type text,
  common_unit text,
  allergen_group text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_catalog_id_format
    check (id ~ '^[a-z][a-z0-9-]{1,79}$'),
  constraint ingredients_catalog_name_length
    check (char_length(btrim(canonical_name)) between 1 and 80),
  constraint ingredients_catalog_category_length
    check (char_length(btrim(category)) between 1 and 40),
  constraint ingredients_catalog_storage_allowed
    check (default_storage_type is null or default_storage_type in ('냉장', '냉동', '실온')),
  constraint ingredients_catalog_unit_length
    check (common_unit is null or char_length(common_unit) <= 24),
  constraint ingredients_catalog_allergen_length
    check (allergen_group is null or char_length(allergen_group) <= 80)
);

create unique index if not exists idx_ingredients_catalog_canonical_name
on public.ingredients_catalog(lower(btrim(canonical_name)));

create table if not exists public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text not null references public.ingredients_catalog(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  alias_type text not null default 'synonym',
  locale text not null default 'ko-KR',
  created_at timestamptz not null default now(),
  constraint ingredient_aliases_alias_length
    check (char_length(btrim(alias)) between 1 and 80),
  constraint ingredient_aliases_normalized_length
    check (char_length(normalized_alias) between 1 and 80),
  constraint ingredient_aliases_normalized_matches_alias
    check (normalized_alias = lower(regexp_replace(btrim(alias), '[[:space:]]+', '', 'g'))),
  constraint ingredient_aliases_type_allowed
    check (alias_type in ('canonical', 'synonym', 'regional', 'spelling', 'editorial')),
  constraint ingredient_aliases_locale_length
    check (char_length(locale) between 2 and 16),
  unique (locale, normalized_alias)
);

create index if not exists idx_ingredient_aliases_ingredient_id
on public.ingredient_aliases(ingredient_id);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id text references public.ingredients_catalog(id),
  group_type text not null default 'main',
  display_name text not null,
  quantity_value numeric,
  quantity_text text,
  unit text,
  preparation text,
  optional boolean not null default false,
  pantry_staple boolean not null default false,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_ingredients_group_type_allowed
    check (group_type in ('main', 'sauce', 'seasoning', 'garnish', 'optional', 'other')),
  constraint recipe_ingredients_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80),
  constraint recipe_ingredients_quantity_value_valid
    check (quantity_value is null or quantity_value >= 0),
  constraint recipe_ingredients_text_lengths
    check (
      (quantity_text is null or char_length(quantity_text) <= 80)
      and (unit is null or char_length(unit) <= 24)
      and (preparation is null or char_length(preparation) <= 240)
    ),
  constraint recipe_ingredients_sort_order_valid
    check (sort_order >= 0),
  unique (recipe_id, sort_order),
  unique (id, recipe_id)
);

create index if not exists idx_recipe_ingredients_recipe_id
on public.recipe_ingredients(recipe_id, sort_order);

create index if not exists idx_recipe_ingredients_ingredient_id
on public.recipe_ingredients(ingredient_id);

create table if not exists public.recipe_ingredient_substitutions (
  id uuid primary key default gen_random_uuid(),
  recipe_ingredient_id uuid not null references public.recipe_ingredients(id) on delete cascade,
  substitute_ingredient_id text references public.ingredients_catalog(id),
  substitute_text text,
  ratio_text text,
  caution_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint recipe_ingredient_substitutions_target_required
    check (
      substitute_ingredient_id is not null
      or nullif(btrim(substitute_text), '') is not null
    ),
  constraint recipe_ingredient_substitutions_text_lengths
    check (
      (substitute_text is null or char_length(substitute_text) <= 120)
      and (ratio_text is null or char_length(ratio_text) <= 120)
      and (caution_text is null or char_length(caution_text) <= 500)
    ),
  constraint recipe_ingredient_substitutions_sort_order_valid
    check (sort_order >= 0),
  unique (recipe_ingredient_id, sort_order)
);

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order integer not null,
  title text,
  instruction text not null,
  heat_level text,
  duration_seconds_min integer,
  duration_seconds_max integer,
  timer_preset_seconds integer,
  visual_cue text,
  sound_cue text,
  smell_cue text,
  safety_note text,
  recovery_tip text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_steps_order_valid
    check (step_order > 0),
  constraint recipe_steps_instruction_length
    check (char_length(btrim(instruction)) between 1 and 2000),
  constraint recipe_steps_title_length
    check (title is null or char_length(title) <= 160),
  constraint recipe_steps_heat_level_allowed
    check (heat_level is null or heat_level in ('none', 'low', 'medium_low', 'medium', 'high')),
  constraint recipe_steps_duration_valid
    check (
      (duration_seconds_min is null or duration_seconds_min >= 0)
      and (duration_seconds_max is null or duration_seconds_max >= 0)
      and (
        duration_seconds_min is null
        or duration_seconds_max is null
        or duration_seconds_max >= duration_seconds_min
      )
      and (timer_preset_seconds is null or timer_preset_seconds > 0)
    ),
  constraint recipe_steps_guidance_lengths
    check (
      (visual_cue is null or char_length(visual_cue) <= 1000)
      and (sound_cue is null or char_length(sound_cue) <= 500)
      and (smell_cue is null or char_length(smell_cue) <= 500)
      and (safety_note is null or char_length(safety_note) <= 1000)
      and (recovery_tip is null or char_length(recovery_tip) <= 1000)
      and (image_url is null or char_length(image_url) <= 2048)
    ),
  unique (recipe_id, step_order),
  unique (id, recipe_id)
);

create index if not exists idx_recipe_steps_recipe_id
on public.recipe_steps(recipe_id, step_order);

create table if not exists public.recipe_step_ingredients (
  recipe_step_id uuid not null,
  recipe_ingredient_id uuid not null,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  usage_text text,
  created_at timestamptz not null default now(),
  primary key (recipe_step_id, recipe_ingredient_id),
  constraint recipe_step_ingredients_step_fk
    foreign key (recipe_step_id, recipe_id)
    references public.recipe_steps(id, recipe_id)
    on delete cascade,
  constraint recipe_step_ingredients_ingredient_fk
    foreign key (recipe_ingredient_id, recipe_id)
    references public.recipe_ingredients(id, recipe_id)
    on delete cascade,
  constraint recipe_step_ingredients_usage_length
    check (usage_text is null or char_length(usage_text) <= 300)
);

create index if not exists idx_recipe_step_ingredients_recipe_id
on public.recipe_step_ingredients(recipe_id);

create table if not exists public.recipe_reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  review_type text not null,
  reviewer text not null,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  score numeric,
  result text not null,
  notes text,
  evidence_reference text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint recipe_reviews_type_allowed
    check (review_type in ('structure', 'editorial', 'beginner', 'food_safety', 'actual_cooking', 'legal_source')),
  constraint recipe_reviews_reviewer_length
    check (char_length(btrim(reviewer)) between 1 and 120),
  constraint recipe_reviews_score_valid
    check (score is null or score between 0 and 100),
  constraint recipe_reviews_result_allowed
    check (result in ('approved', 'needs_revision', 'rejected')),
  constraint recipe_reviews_notes_length
    check (notes is null or char_length(notes) <= 5000),
  constraint recipe_reviews_evidence_length
    check (evidence_reference is null or char_length(evidence_reference) <= 2048)
);

create index if not exists idx_recipe_reviews_recipe_type
on public.recipe_reviews(recipe_id, review_type, reviewed_at desc);

create table if not exists public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_summary text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recipe_versions_change_summary_length
    check (change_summary is null or char_length(change_summary) <= 500),
  unique (recipe_id, version)
);

create index if not exists idx_recipe_versions_recipe_created
on public.recipe_versions(recipe_id, created_at desc);

drop trigger if exists set_recipe_categories_updated_at on public.recipe_categories;
create trigger set_recipe_categories_updated_at
  before update on public.recipe_categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_ingredients_catalog_updated_at on public.ingredients_catalog;
create trigger set_ingredients_catalog_updated_at
  before update on public.ingredients_catalog
  for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_ingredients_updated_at on public.recipe_ingredients;
create trigger set_recipe_ingredients_updated_at
  before update on public.recipe_ingredients
  for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_steps_updated_at on public.recipe_steps;
create trigger set_recipe_steps_updated_at
  before update on public.recipe_steps
  for each row execute function public.set_updated_at();

create or replace function app.build_recipe_v2_snapshot(target_recipe_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, app
as $$
declare
  snapshot_value jsonb;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;

  select jsonb_build_object(
    'snapshot_version', 1,
    'recipe', to_jsonb(recipe_row),
    'recipe_ingredients', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
      from public.recipe_ingredients item
      where item.recipe_id = recipe_row.id
    ), '[]'::jsonb),
    'ingredient_substitutions', coalesce((
      select jsonb_agg(to_jsonb(substitution) order by substitution.recipe_ingredient_id, substitution.sort_order, substitution.id)
      from public.recipe_ingredient_substitutions substitution
      join public.recipe_ingredients item on item.id = substitution.recipe_ingredient_id
      where item.recipe_id = recipe_row.id
    ), '[]'::jsonb),
    'recipe_steps', coalesce((
      select jsonb_agg(to_jsonb(step_row) order by step_row.step_order, step_row.id)
      from public.recipe_steps step_row
      where step_row.recipe_id = recipe_row.id
    ), '[]'::jsonb),
    'step_ingredients', coalesce((
      select jsonb_agg(to_jsonb(usage) order by usage.recipe_step_id, usage.recipe_ingredient_id)
      from public.recipe_step_ingredients usage
      where usage.recipe_id = recipe_row.id
    ), '[]'::jsonb)
  )
  into snapshot_value
  from public.recipes recipe_row
  where recipe_row.id = target_recipe_id;

  if snapshot_value is null then
    raise exception 'recipe_not_found';
  end if;

  return snapshot_value;
end;
$$;

create or replace function public.capture_recipe_version(
  target_recipe_id uuid,
  expected_version integer,
  change_summary text default null,
  changed_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, app
as $$
declare
  current_version integer;
  next_version integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if change_summary is not null and char_length(change_summary) > 500 then
    raise exception 'change_summary_too_long';
  end if;

  select version into current_version
  from public.recipes
  where id = target_recipe_id
  for update;

  if current_version is null then
    raise exception 'recipe_not_found';
  end if;
  if current_version <> expected_version then
    raise exception 'recipe_version_conflict';
  end if;

  insert into public.recipe_versions (
    recipe_id,
    version,
    snapshot,
    change_summary,
    changed_by
  ) values (
    target_recipe_id,
    current_version,
    app.build_recipe_v2_snapshot(target_recipe_id),
    nullif(btrim(change_summary), ''),
    changed_by
  );

  next_version := current_version + 1;
  update public.recipes
  set version = next_version,
      updated_at = now()
  where id = target_recipe_id;

  return next_version;
end;
$$;

create or replace function public.restore_recipe_version(
  target_recipe_id uuid,
  target_version integer,
  expected_current_version integer,
  change_summary text default null,
  changed_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, app
as $$
declare
  current_version integer;
  next_version integer;
  target_snapshot jsonb;
  restored_recipe public.recipes%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if change_summary is not null and char_length(change_summary) > 500 then
    raise exception 'change_summary_too_long';
  end if;

  select version into current_version
  from public.recipes
  where id = target_recipe_id
  for update;

  if current_version is null then
    raise exception 'recipe_not_found';
  end if;
  if current_version <> expected_current_version then
    raise exception 'recipe_version_conflict';
  end if;

  select snapshot into target_snapshot
  from public.recipe_versions
  where recipe_id = target_recipe_id
    and version = target_version;

  if target_snapshot is null then
    raise exception 'recipe_version_not_found';
  end if;
  if coalesce((target_snapshot ->> 'snapshot_version')::integer, 0) <> 1 then
    raise exception 'unsupported_snapshot_version';
  end if;
  if exists (
    select 1 from public.recipe_versions
    where recipe_id = target_recipe_id and version = current_version
  ) then
    raise exception 'current_version_already_archived';
  end if;

  insert into public.recipe_versions (
    recipe_id,
    version,
    snapshot,
    change_summary,
    changed_by
  ) values (
    target_recipe_id,
    current_version,
    app.build_recipe_v2_snapshot(target_recipe_id),
    coalesce(nullif(btrim(change_summary), ''), format('before restore to version %s', target_version)),
    changed_by
  );

  select * into restored_recipe
  from jsonb_populate_record(null::public.recipes, target_snapshot -> 'recipe');

  if restored_recipe.id is distinct from target_recipe_id then
    raise exception 'snapshot_recipe_mismatch';
  end if;

  next_version := current_version + 1;

  update public.recipes
  set slug = restored_recipe.slug,
      title = restored_recipe.title,
      summary = restored_recipe.summary,
      description = restored_recipe.description,
      category = restored_recipe.category,
      category_id = restored_recipe.category_id,
      cuisine_type = restored_recipe.cuisine_type,
      difficulty = restored_recipe.difficulty,
      cooking_time = restored_recipe.cooking_time,
      servings = restored_recipe.servings,
      servings_base = restored_recipe.servings_base,
      prep_time_minutes = restored_recipe.prep_time_minutes,
      cook_time_minutes = restored_recipe.cook_time_minutes,
      total_time_minutes = restored_recipe.total_time_minutes,
      thumbnail_url = restored_recipe.thumbnail_url,
      tools = restored_recipe.tools,
      ingredients = restored_recipe.ingredients,
      steps = restored_recipe.steps,
      storage_guide = restored_recipe.storage_guide,
      reheating_guide = restored_recipe.reheating_guide,
      safety_notes = restored_recipe.safety_notes,
      source_id = restored_recipe.source_id,
      content_origin = restored_recipe.content_origin,
      reviewed_for_beginner = restored_recipe.reviewed_for_beginner,
      review_status = restored_recipe.review_status,
      beginner_reviewed_at = restored_recipe.beginner_reviewed_at,
      actual_cooking_tested = restored_recipe.actual_cooking_tested,
      actual_cooking_tested_at = restored_recipe.actual_cooking_tested_at,
      food_safety_reviewed = restored_recipe.food_safety_reviewed,
      food_safety_reviewed_at = restored_recipe.food_safety_reviewed_at,
      image_rights_status = restored_recipe.image_rights_status,
      image_rights_reviewed_at = restored_recipe.image_rights_reviewed_at,
      source_reviewed_at = restored_recipe.source_reviewed_at,
      reviewer = restored_recipe.reviewer,
      published_at = restored_recipe.published_at,
      source = restored_recipe.source,
      schema_version = restored_recipe.schema_version,
      version = next_version,
      updated_at = now()
  where id = target_recipe_id;

  delete from public.recipe_step_ingredients where recipe_id = target_recipe_id;
  delete from public.recipe_ingredient_substitutions substitution
  using public.recipe_ingredients item
  where substitution.recipe_ingredient_id = item.id
    and item.recipe_id = target_recipe_id;
  delete from public.recipe_steps where recipe_id = target_recipe_id;
  delete from public.recipe_ingredients where recipe_id = target_recipe_id;

  insert into public.recipe_ingredients
  select *
  from jsonb_populate_recordset(
    null::public.recipe_ingredients,
    coalesce(target_snapshot -> 'recipe_ingredients', '[]'::jsonb)
  );

  insert into public.recipe_steps
  select *
  from jsonb_populate_recordset(
    null::public.recipe_steps,
    coalesce(target_snapshot -> 'recipe_steps', '[]'::jsonb)
  );

  insert into public.recipe_ingredient_substitutions
  select *
  from jsonb_populate_recordset(
    null::public.recipe_ingredient_substitutions,
    coalesce(target_snapshot -> 'ingredient_substitutions', '[]'::jsonb)
  );

  insert into public.recipe_step_ingredients
  select *
  from jsonb_populate_recordset(
    null::public.recipe_step_ingredients,
    coalesce(target_snapshot -> 'step_ingredients', '[]'::jsonb)
  );

  return next_version;
end;
$$;

revoke all on function app.build_recipe_v2_snapshot(uuid) from public, anon, authenticated;
grant execute on function app.build_recipe_v2_snapshot(uuid) to service_role;

revoke all on function public.capture_recipe_version(uuid, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.capture_recipe_version(uuid, integer, text, uuid) to service_role;

revoke all on function public.restore_recipe_version(uuid, integer, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.restore_recipe_version(uuid, integer, integer, text, uuid) to service_role;

alter table public.recipe_categories enable row level security;
alter table public.ingredients_catalog enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_ingredient_substitutions enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_step_ingredients enable row level security;
alter table public.recipe_reviews enable row level security;
alter table public.recipe_versions enable row level security;

revoke all on table public.recipe_categories from anon, authenticated;
revoke all on table public.ingredients_catalog from anon, authenticated;
revoke all on table public.ingredient_aliases from anon, authenticated;
revoke all on table public.recipe_ingredients from anon, authenticated;
revoke all on table public.recipe_ingredient_substitutions from anon, authenticated;
revoke all on table public.recipe_steps from anon, authenticated;
revoke all on table public.recipe_step_ingredients from anon, authenticated;
revoke all on table public.recipe_reviews from anon, authenticated;
revoke all on table public.recipe_versions from anon, authenticated;

grant all on table public.recipe_categories to service_role;
grant all on table public.ingredients_catalog to service_role;
grant all on table public.ingredient_aliases to service_role;
grant all on table public.recipe_ingredients to service_role;
grant all on table public.recipe_ingredient_substitutions to service_role;
grant all on table public.recipe_steps to service_role;
grant all on table public.recipe_step_ingredients to service_role;
grant all on table public.recipe_reviews to service_role;
grant all on table public.recipe_versions to service_role;

drop policy if exists recipe_categories_select_public on public.recipe_categories;
create policy recipe_categories_select_public
on public.recipe_categories
for select
to anon, authenticated
using (active is true);

grant select on table public.recipe_categories to anon, authenticated;

comment on table public.recipe_ingredients is
  'Phase 1 normalized recipe ingredients. Legacy recipes.ingredients remains until migration validation and API cutover.';
comment on table public.recipe_versions is
  'Service-role-only complete recipe snapshots used for optimistic capture and reversible restore.';
comment on column public.recipes.schema_version is
  '1 means legacy JSONB is authoritative; 2 is set only after normalized child validation succeeds.';

notify pgrst, 'reload schema';

insert into public.ingredients_catalog (
  id, canonical_name, category, default_storage_type, common_unit, allergen_group
) values
  ('veg-onion', '양파', '채소', '냉장', 'piece', null),
  ('veg-green-onion', '대파', '채소', '냉장', 'piece', null),
  ('veg-garlic', '마늘', '채소', '냉장', 'g', null),
  ('veg-potato', '감자', '채소', '실온', 'piece', null),
  ('veg-sweet-potato', '고구마', '채소', '실온', 'piece', null),
  ('veg-carrot', '당근', '채소', '냉장', 'piece', null),
  ('veg-zucchini', '애호박', '채소', '냉장', 'piece', null),
  ('veg-cucumber', '오이', '채소', '냉장', 'piece', null),
  ('veg-cabbage', '양배추', '채소', '냉장', 'piece', null),
  ('veg-kimchi-cabbage', '배추', '채소', '냉장', 'piece', null),
  ('veg-radish', '무', '채소', '냉장', 'piece', null),
  ('veg-broccoli', '브로콜리', '채소', '냉장', 'piece', null),
  ('veg-mushroom', '버섯', '채소', '냉장', 'pack', null),
  ('veg-spinach', '시금치', '채소', '냉장', 'bag', null),
  ('veg-paprika', '파프리카', '채소', '냉장', 'piece', null),
  ('veg-lettuce', '상추', '채소', '냉장', 'bag', null),
  ('veg-perilla-leaf', '깻잎', '채소', '냉장', 'pack', null),
  ('veg-bean-sprout', '콩나물', '채소', '냉장', 'bag', null),
  ('veg-sprout', '숙주', '채소', '냉장', 'bag', null),
  ('veg-tomato-cherry', '방울토마토', '채소', '냉장', 'pack', null),
  ('fruit-apple', '사과', '과일', '실온', 'piece', null),
  ('fruit-pear', '배', '과일', '실온', 'piece', null),
  ('fruit-banana', '바나나', '과일', '실온', 'piece', null),
  ('fruit-strawberry', '딸기', '과일', '냉장', 'pack', null),
  ('fruit-orange', '오렌지', '과일', '실온', 'piece', null),
  ('fruit-tangerine', '귤', '과일', '실온', 'piece', null),
  ('fruit-lemon', '레몬', '과일', '냉장', 'piece', null),
  ('fruit-lime', '라임', '과일', '냉장', 'piece', null),
  ('fruit-grape', '포도', '과일', '냉장', 'pack', null),
  ('fruit-blueberry', '블루베리', '과일', '냉장', 'pack', null),
  ('fruit-kiwi', '키위', '과일', '실온', 'piece', null),
  ('fruit-mango', '망고', '과일', '실온', 'piece', null),
  ('fruit-pineapple', '파인애플', '과일', '실온', 'piece', null),
  ('fruit-avocado', '아보카도', '과일', '실온', 'piece', null),
  ('meat-beef', '소고기', '육류', '냉장', 'g', null),
  ('meat-pork', '돼지고기', '육류', '냉장', 'g', null),
  ('meat-pork-belly', '삼겹살', '육류', '냉장', 'g', null),
  ('meat-pork-neck', '목살', '육류', '냉장', 'g', null),
  ('meat-beef-bulgogi', '불고기용 소고기', '육류', '냉장', 'g', null),
  ('meat-chicken', '닭고기', '육류', '냉장', 'g', null),
  ('meat-chicken-breast', '닭가슴살', '육류', '냉장', 'pack', null),
  ('meat-chicken-leg', '닭다리', '육류', '냉장', 'piece', null),
  ('meat-duck', '오리고기', '육류', '냉장', 'g', null),
  ('meat-bacon', '베이컨', '육류', '냉장', 'pack', null),
  ('meat-ham', '햄', '육류', '냉장', 'pack', null),
  ('meat-sausage', '소시지', '육류', '냉장', 'pack', null),
  ('sea-mackerel', '고등어', '수산물', '냉장', 'piece', null),
  ('sea-salmon', '연어', '수산물', '냉장', 'g', null),
  ('sea-tuna', '참치', '수산물', '냉장', 'g', null),
  ('sea-shrimp', '새우', '수산물', '냉장', 'g', null),
  ('sea-squid', '오징어', '수산물', '냉장', 'piece', null),
  ('sea-octopus', '문어', '수산물', '냉장', 'piece', null),
  ('sea-anchovy', '멸치', '수산물', '실온', 'g', null),
  ('sea-kelp', '다시마', '수산물', '실온', 'sheet', null),
  ('sea-seaweed', '미역', '수산물', '실온', 'g', null),
  ('sea-clam', '바지락', '수산물', '냉장', 'pack', null),
  ('sea-pollack-roe', '명란', '수산물', '냉장', 'pack', null),
  ('sea-fishcake', '어묵', '수산물', '냉장', 'pack', null),
  ('dairy-milk', '우유', '유제품', '냉장', 'ml', null),
  ('dairy-soy-milk', '두유', '유제품', '냉장', 'ml', null),
  ('dairy-cheese', '치즈', '유제품', '냉장', 'pack', null),
  ('dairy-mozzarella', '모짜렐라치즈', '유제품', '냉장', 'pack', null),
  ('dairy-butter', '버터', '유제품', '냉장', 'g', null),
  ('dairy-yogurt', '요거트', '유제품', '냉장', 'cup', null),
  ('dairy-whipping-cream', '생크림', '유제품', '냉장', 'ml', null),
  ('dairy-egg', '계란', '육류', '냉장', 'piece', null),
  ('dairy-tofu', '두부', '통조림/가공식품', '냉장', 'block', null),
  ('dairy-cream-cheese', '크림치즈', '유제품', '냉장', 'g', null),
  ('dairy-mayonnaise', '마요네즈', '유제품', '냉장', 'g', null),
  ('dairy-parmesan', '파마산치즈', '유제품', '냉장', 'g', null),
  ('frozen-dumpling', '냉동만두', '냉동식품', '냉동', 'bag', null),
  ('frozen-rice', '냉동볶음밥', '냉동식품', '냉동', 'pack', null),
  ('frozen-pizza', '냉동피자', '냉동식품', '냉동', 'piece', null),
  ('frozen-udon', '냉동우동면', '냉동식품', '냉동', 'pack', null),
  ('frozen-shrimp', '냉동새우', '냉동식품', '냉동', 'bag', null),
  ('frozen-squid', '냉동오징어', '냉동식품', '냉동', 'bag', null),
  ('frozen-chicken', '냉동닭가슴살', '냉동식품', '냉동', 'pack', null),
  ('frozen-pork-cutlet', '냉동돈까스', '냉동식품', '냉동', 'pack', null),
  ('frozen-fishcake', '냉동어묵', '냉동식품', '냉동', 'pack', null),
  ('frozen-vegetable-mix', '냉동야채믹스', '냉동식품', '냉동', 'bag', null),
  ('frozen-blueberry', '냉동블루베리', '냉동식품', '냉동', 'bag', null),
  ('frozen-fries', '냉동감자튀김', '냉동식품', '냉동', 'bag', null),
  ('season-soy-soup', '국간장', '조미료', '실온', 'tbsp', null),
  ('season-soy-dark', '진간장', '조미료', '실온', 'tbsp', null),
  ('season-gochujang', '고추장', '조미료', '실온', 'tbsp', null),
  ('season-doenjang', '된장', '조미료', '실온', 'tbsp', null),
  ('season-ssamjang', '쌈장', '조미료', '실온', 'tbsp', null),
  ('season-salt', '소금', '조미료', '실온', 'tsp', null),
  ('season-sugar', '설탕', '조미료', '실온', 'tbsp', null),
  ('season-vinegar', '식초', '조미료', '실온', 'tbsp', null),
  ('season-sesame-oil', '참기름', '조미료', '실온', 'tbsp', null),
  ('season-perilla-oil', '들기름', '조미료', '실온', 'tbsp', null),
  ('season-pepper', '후추', '조미료', '실온', 'tsp', null),
  ('season-pepper-powder', '고춧가루', '조미료', '실온', 'tbsp', null),
  ('season-oyster-sauce', '굴소스', '조미료', '실온', 'tbsp', null),
  ('season-curry', '카레가루', '조미료', '실온', 'tbsp', null),
  ('season-ketchup', '케첩', '조미료', '실온', 'tbsp', null),
  ('grain-rice', '쌀', '곡물/면/빵', '실온', 'kg', null),
  ('grain-brown-rice', '현미', '곡물/면/빵', '실온', 'kg', null),
  ('grain-flour', '밀가루', '곡물/면/빵', '실온', 'g', null),
  ('grain-starch', '전분', '곡물/면/빵', '실온', 'g', null),
  ('grain-noodle', '국수', '곡물/면/빵', '실온', 'g', null),
  ('grain-ramen', '라면', '곡물/면/빵', '실온', 'pack', null),
  ('grain-pasta', '파스타면', '곡물/면/빵', '실온', 'g', null),
  ('grain-udon', '우동면', '곡물/면/빵', '냉장', 'pack', null),
  ('grain-bread', '식빵', '곡물/면/빵', '실온', 'slice', null),
  ('grain-baguette', '바게트', '곡물/면/빵', '실온', 'piece', null),
  ('grain-breadcrumb', '빵가루', '곡물/면/빵', '실온', 'g', null),
  ('grain-ricecake', '떡', '곡물/면/빵', '냉장', 'pack', null),
  ('proc-tuna-can', '참치캔', '통조림/가공식품', '실온', 'can', null),
  ('proc-corn-can', '옥수수캔', '통조림/가공식품', '실온', 'can', null),
  ('proc-beans-can', '콩통조림', '통조림/가공식품', '실온', 'can', null),
  ('proc-spam', '스팸', '통조림/가공식품', '실온', 'can', null),
  ('proc-kimchi', '김치', '통조림/가공식품', '냉장', 'pack', null),
  ('proc-pickle', '피클', '통조림/가공식품', '냉장', 'bottle', null),
  ('proc-olive', '올리브', '통조림/가공식품', '냉장', 'bottle', null),
  ('proc-jam', '잼', '통조림/가공식품', '냉장', 'bottle', null),
  ('proc-sauce-pasta', '토마토소스', '통조림/가공식품', '실온', 'bottle', null),
  ('proc-stock', '육수팩', '통조림/가공식품', '실온', 'pack', null),
  ('misc-water', '생수', '음료/기타', '실온', 'bottle', null),
  ('misc-sparkling-water', '탄산수', '음료/기타', '실온', 'bottle', null),
  ('misc-orange-juice', '오렌지주스', '음료/기타', '냉장', 'ml', null),
  ('misc-apple-juice', '사과주스', '음료/기타', '냉장', 'ml', null),
  ('misc-coffee', '커피', '음료/기타', '실온', 'g', null),
  ('misc-tea', '티백', '음료/기타', '실온', 'pack', null),
  ('misc-nuts', '견과류', '음료/기타', '실온', 'bag', null),
  ('misc-honey', '꿀', '음료/기타', '실온', 'tbsp', null),
  ('misc-syrup', '올리고당', '음료/기타', '실온', 'tbsp', null),
  ('misc-cocoa', '코코아가루', '음료/기타', '실온', 'tbsp', null),
  ('veg-chili-pepper', '고추', '채소', '냉장', 'piece', null),
  ('veg-eggplant', '가지', '채소', '냉장', 'piece', null),
  ('veg-garlic-chive', '부추', '채소', '냉장', 'bag', null),
  ('veg-minari', '미나리', '채소', '냉장', 'bag', null),
  ('veg-bok-choy', '청경채', '채소', '냉장', 'bag', null),
  ('veg-young-napa', '알배추', '채소', '냉장', 'piece', null),
  ('veg-pumpkin-sweet', '단호박', '채소', '실온', 'piece', null),
  ('veg-lotus-root', '연근', '채소', '냉장', 'g', null),
  ('veg-burdock', '우엉', '채소', '냉장', 'g', null),
  ('veg-bracken', '고사리', '채소', '냉장', 'pack', null),
  ('veg-balloon-flower-root', '도라지', '채소', '냉장', 'pack', null),
  ('veg-chives', '실파', '채소', '냉장', 'bag', null),
  ('meat-ground-pork', '다진 돼지고기', '육류', '냉장', 'g', null),
  ('meat-ground-beef', '다진 소고기', '육류', '냉장', 'g', null),
  ('meat-chicken-tenderloin', '닭안심', '육류', '냉장', 'g', null),
  ('meat-pork-rib', '돼지갈비', '육류', '냉장', 'g', null),
  ('sea-hairtail', '갈치', '수산물', '냉장', 'piece', null),
  ('sea-cod', '대구', '수산물', '냉장', 'piece', null),
  ('sea-pollack', '동태', '수산물', '냉동', 'piece', null),
  ('sea-dried-pollack', '황태채', '수산물', '실온', 'g', null),
  ('frozen-tteokbokki', '냉동떡볶이', '냉동식품', '냉동', 'pack', null),
  ('frozen-hotdog', '냉동핫도그', '냉동식품', '냉동', 'pack', null),
  ('frozen-corn', '냉동옥수수', '냉동식품', '냉동', 'bag', null),
  ('frozen-spinach', '냉동시금치', '냉동식품', '냉동', 'bag', null),
  ('season-cooking-wine', '맛술', '조미료', '실온', 'tbsp', null),
  ('season-fish-sauce-anchovy', '멸치액젓', '조미료', '실온', 'tbsp', null),
  ('season-fish-sauce-sandlance', '까나리액젓', '조미료', '실온', 'tbsp', null),
  ('season-chicken-stock', '치킨스톡', '조미료', '실온', 'tbsp', null),
  ('season-sesame-seed', '깨', '조미료', '실온', 'tsp', null),
  ('season-perilla-powder', '들깨가루', '조미료', '실온', 'tbsp', null),
  ('season-chili-oil', '고추기름', '조미료', '실온', 'tbsp', null),
  ('season-mustard', '겨자', '조미료', '냉장', 'tsp', null),
  ('season-plum-syrup', '매실청', '조미료', '실온', 'tbsp', null),
  ('grain-glass-noodle', '당면', '곡물/면/빵', '실온', 'g', null),
  ('grain-somen', '소면', '곡물/면/빵', '실온', 'g', null),
  ('grain-ramyeon-noodle', '라면사리', '곡물/면/빵', '실온', 'pack', null),
  ('grain-tortilla', '또띠아', '곡물/면/빵', '냉장', 'pack', null),
  ('grain-rice-paper', '라이스페이퍼', '곡물/면/빵', '실온', 'pack', null),
  ('grain-oatmeal', '오트밀', '곡물/면/빵', '실온', 'g', null),
  ('proc-tomato-can', '토마토캔', '통조림/가공식품', '실온', 'can', null),
  ('proc-whelk-can', '골뱅이캔', '통조림/가공식품', '실온', 'can', null),
  ('proc-pacific-saury-can', '꽁치캔', '통조림/가공식품', '실온', 'can', null),
  ('proc-mackerel-can', '고등어캔', '통조림/가공식품', '실온', 'can', null),
  ('proc-chicken-breast-can', '닭가슴살캔', '통조림/가공식품', '실온', 'can', null)
on conflict (id) do update
set canonical_name = excluded.canonical_name,
    category = excluded.category,
    default_storage_type = excluded.default_storage_type,
    common_unit = excluded.common_unit,
    allergen_group = excluded.allergen_group,
    active = true,
    updated_at = now();

insert into public.ingredient_aliases (
  ingredient_id, alias, normalized_alias, alias_type, locale
) values
  ('veg-eggplant', '가지', '가지', 'canonical', 'ko-KR'),
  ('season-soy-dark', '간장', '간장', 'synonym', 'ko-KR'),
  ('season-sugar', '갈색설탕', '갈색설탕', 'synonym', 'ko-KR'),
  ('sea-hairtail', '갈치', '갈치', 'canonical', 'ko-KR'),
  ('veg-potato', '감자', '감자', 'canonical', 'ko-KR'),
  ('grain-starch', '감자전분', '감자전분', 'synonym', 'ko-KR'),
  ('proc-beans-can', '강낭콩', '강낭콩', 'synonym', 'ko-KR'),
  ('season-mustard', '겨자', '겨자', 'canonical', 'ko-KR'),
  ('misc-nuts', '견과류', '견과류', 'canonical', 'ko-KR'),
  ('dairy-egg', '계란', '계란', 'canonical', 'ko-KR'),
  ('veg-sweet-potato', '고구마', '고구마', 'canonical', 'ko-KR'),
  ('sea-mackerel', '고등어', '고등어', 'canonical', 'ko-KR'),
  ('proc-mackerel-can', '고등어캔', '고등어캔', 'canonical', 'ko-KR'),
  ('proc-mackerel-can', '고등어 통조림', '고등어통조림', 'synonym', 'ko-KR'),
  ('veg-bracken', '고사리', '고사리', 'canonical', 'ko-KR'),
  ('veg-chili-pepper', '고추', '고추', 'canonical', 'ko-KR'),
  ('season-chili-oil', '고추기름', '고추기름', 'canonical', 'ko-KR'),
  ('season-gochujang', '고추장', '고추장', 'canonical', 'ko-KR'),
  ('season-pepper-powder', '고춧가루', '고춧가루', 'canonical', 'ko-KR'),
  ('proc-whelk-can', '골뱅이캔', '골뱅이캔', 'canonical', 'ko-KR'),
  ('proc-whelk-can', '골뱅이 통조림', '골뱅이통조림', 'synonym', 'ko-KR'),
  ('season-soy-soup', '국간장', '국간장', 'canonical', 'ko-KR'),
  ('meat-beef', '국거리', '국거리', 'synonym', 'ko-KR'),
  ('sea-anchovy', '국물멸치', '국물멸치', 'synonym', 'ko-KR'),
  ('grain-noodle', '국수', '국수', 'canonical', 'ko-KR'),
  ('season-oyster-sauce', '굴소스', '굴소스', 'canonical', 'ko-KR'),
  ('season-salt', '굵은소금', '굵은소금', 'synonym', 'ko-KR'),
  ('veg-green-onion', '굵은파', '굵은파', 'synonym', 'ko-KR'),
  ('fruit-tangerine', '귤', '귤', 'canonical', 'ko-KR'),
  ('proc-kimchi', '김치', '김치', 'canonical', 'ko-KR'),
  ('season-fish-sauce-sandlance', '까나리액젓', '까나리액젓', 'canonical', 'ko-KR'),
  ('veg-garlic', '깐마늘', '깐마늘', 'synonym', 'ko-KR'),
  ('season-sesame-seed', '깨', '깨', 'canonical', 'ko-KR'),
  ('veg-perilla-leaf', '깻잎', '깻잎', 'canonical', 'ko-KR'),
  ('proc-pacific-saury-can', '꽁치캔', '꽁치캔', 'canonical', 'ko-KR'),
  ('proc-pacific-saury-can', '꽁치 통조림', '꽁치통조림', 'synonym', 'ko-KR'),
  ('season-salt', '꽃소금', '꽃소금', 'synonym', 'ko-KR'),
  ('misc-honey', '꿀', '꿀', 'canonical', 'ko-KR'),
  ('frozen-fries', '냉동감자튀김', '냉동감자튀김', 'canonical', 'ko-KR'),
  ('frozen-chicken', '냉동닭가슴살', '냉동닭가슴살', 'canonical', 'ko-KR'),
  ('frozen-pork-cutlet', '냉동돈까스', '냉동돈까스', 'canonical', 'ko-KR'),
  ('frozen-tteokbokki', '냉동떡볶이', '냉동떡볶이', 'canonical', 'ko-KR'),
  ('frozen-dumpling', '냉동만두', '냉동만두', 'canonical', 'ko-KR'),
  ('frozen-rice', '냉동볶음밥', '냉동볶음밥', 'canonical', 'ko-KR'),
  ('frozen-blueberry', '냉동블루베리', '냉동블루베리', 'canonical', 'ko-KR'),
  ('frozen-shrimp', '냉동새우', '냉동새우', 'canonical', 'ko-KR'),
  ('frozen-spinach', '냉동시금치', '냉동시금치', 'canonical', 'ko-KR'),
  ('frozen-vegetable-mix', '냉동야채믹스', '냉동야채믹스', 'canonical', 'ko-KR'),
  ('frozen-fishcake', '냉동어묵', '냉동어묵', 'canonical', 'ko-KR'),
  ('frozen-squid', '냉동오징어', '냉동오징어', 'canonical', 'ko-KR'),
  ('frozen-corn', '냉동옥수수', '냉동옥수수', 'canonical', 'ko-KR'),
  ('frozen-udon', '냉동우동면', '냉동우동면', 'canonical', 'ko-KR'),
  ('frozen-pizza', '냉동피자', '냉동피자', 'canonical', 'ko-KR'),
  ('frozen-hotdog', '냉동핫도그', '냉동핫도그', 'canonical', 'ko-KR'),
  ('veg-paprika', '노랑 파프리카', '노랑파프리카', 'synonym', 'ko-KR'),
  ('misc-tea', '녹차', '녹차', 'synonym', 'ko-KR'),
  ('veg-mushroom', '느타리버섯', '느타리버섯', 'synonym', 'ko-KR'),
  ('sea-kelp', '다시마', '다시마', 'canonical', 'ko-KR'),
  ('meat-ground-pork', '다진 돼지고기', '다진돼지고기', 'canonical', 'ko-KR'),
  ('meat-ground-beef', '다진 소고기', '다진소고기', 'canonical', 'ko-KR'),
  ('veg-pumpkin-sweet', '단호박', '단호박', 'canonical', 'ko-KR'),
  ('dairy-egg', '달걀', '달걀', 'synonym', 'ko-KR'),
  ('meat-chicken-breast', '닭가슴살', '닭가슴살', 'canonical', 'ko-KR'),
  ('proc-chicken-breast-can', '닭가슴살캔', '닭가슴살캔', 'canonical', 'ko-KR'),
  ('meat-chicken', '닭고기', '닭고기', 'canonical', 'ko-KR'),
  ('meat-chicken-leg', '닭다리', '닭다리', 'canonical', 'ko-KR'),
  ('meat-chicken-tenderloin', '닭안심', '닭안심', 'canonical', 'ko-KR'),
  ('season-chicken-stock', '닭육수', '닭육수', 'synonym', 'ko-KR'),
  ('meat-chicken', '닭정육', '닭정육', 'synonym', 'ko-KR'),
  ('veg-carrot', '당근', '당근', 'canonical', 'ko-KR'),
  ('grain-glass-noodle', '당면', '당면', 'canonical', 'ko-KR'),
  ('sea-cod', '대구', '대구', 'canonical', 'ko-KR'),
  ('veg-green-onion', '대파', '대파', 'canonical', 'ko-KR'),
  ('veg-balloon-flower-root', '도라지', '도라지', 'canonical', 'ko-KR'),
  ('sea-pollack', '동태', '동태', 'canonical', 'ko-KR'),
  ('meat-pork-rib', '돼지갈비', '돼지갈비', 'canonical', 'ko-KR'),
  ('meat-pork', '돼지고기', '돼지고기', 'canonical', 'ko-KR'),
  ('meat-ground-pork', '돼지고기 다짐육', '돼지고기다짐육', 'synonym', 'ko-KR'),
  ('season-doenjang', '된장', '된장', 'canonical', 'ko-KR'),
  ('dairy-tofu', '두부', '두부', 'canonical', 'ko-KR'),
  ('dairy-soy-milk', '두유', '두유', 'canonical', 'ko-KR'),
  ('meat-pork', '뒷다리살', '뒷다리살', 'synonym', 'ko-KR'),
  ('season-perilla-oil', '들기름', '들기름', 'canonical', 'ko-KR'),
  ('season-perilla-powder', '들깨가루', '들깨가루', 'canonical', 'ko-KR'),
  ('fruit-strawberry', '딸기', '딸기', 'canonical', 'ko-KR'),
  ('proc-jam', '딸기잼', '딸기잼', 'synonym', 'ko-KR'),
  ('grain-ricecake', '떡', '떡', 'canonical', 'ko-KR'),
  ('grain-ricecake', '떡국떡', '떡국떡', 'synonym', 'ko-KR'),
  ('grain-ricecake', '떡볶이떡', '떡볶이떡', 'synonym', 'ko-KR'),
  ('grain-tortilla', '또띠아', '또띠아', 'canonical', 'ko-KR'),
  ('grain-ramen', '라면', '라면', 'canonical', 'ko-KR'),
  ('grain-ramyeon-noodle', '라면사리', '라면사리', 'canonical', 'ko-KR'),
  ('grain-rice-paper', '라이스페이퍼', '라이스페이퍼', 'canonical', 'ko-KR'),
  ('fruit-lime', '라임', '라임', 'canonical', 'ko-KR'),
  ('fruit-lemon', '레몬', '레몬', 'canonical', 'ko-KR'),
  ('veg-garlic', '마늘', '마늘', 'canonical', 'ko-KR'),
  ('dairy-mayonnaise', '마요네즈', '마요네즈', 'canonical', 'ko-KR'),
  ('season-cooking-wine', '맛술', '맛술', 'canonical', 'ko-KR'),
  ('fruit-mango', '망고', '망고', 'canonical', 'ko-KR'),
  ('season-plum-syrup', '매실청', '매실청', 'canonical', 'ko-KR'),
  ('sea-anchovy', '멸치', '멸치', 'canonical', 'ko-KR'),
  ('season-fish-sauce-anchovy', '멸치액젓', '멸치액젓', 'canonical', 'ko-KR'),
  ('proc-stock', '멸치육수팩', '멸치육수팩', 'synonym', 'ko-KR'),
  ('sea-pollack-roe', '명란', '명란', 'canonical', 'ko-KR'),
  ('sea-pollack-roe', '명란젓', '명란젓', 'synonym', 'ko-KR'),
  ('sea-pollack', '명태', '명태', 'synonym', 'ko-KR'),
  ('dairy-mozzarella', '모짜렐라', '모짜렐라', 'synonym', 'ko-KR'),
  ('dairy-mozzarella', '모짜렐라치즈', '모짜렐라치즈', 'canonical', 'ko-KR'),
  ('meat-pork-neck', '목살', '목살', 'canonical', 'ko-KR'),
  ('veg-radish', '무', '무', 'canonical', 'ko-KR'),
  ('sea-octopus', '문어', '문어', 'canonical', 'ko-KR'),
  ('veg-minari', '미나리', '미나리', 'canonical', 'ko-KR'),
  ('season-cooking-wine', '미림', '미림', 'synonym', 'ko-KR'),
  ('sea-seaweed', '미역', '미역', 'canonical', 'ko-KR'),
  ('grain-flour', '밀가루', '밀가루', 'canonical', 'ko-KR'),
  ('grain-baguette', '바게트', '바게트', 'canonical', 'ko-KR'),
  ('fruit-banana', '바나나', '바나나', 'canonical', 'ko-KR'),
  ('sea-clam', '바지락', '바지락', 'canonical', 'ko-KR'),
  ('veg-sweet-potato', '밤고구마', '밤고구마', 'synonym', 'ko-KR'),
  ('veg-tomato-cherry', '방울토마토', '방울토마토', 'canonical', 'ko-KR'),
  ('fruit-pear', '배', '배', 'canonical', 'ko-KR'),
  ('veg-kimchi-cabbage', '배추', '배추', 'canonical', 'ko-KR'),
  ('proc-kimchi', '배추김치', '배추김치', 'synonym', 'ko-KR'),
  ('season-sugar', '백설탕', '백설탕', 'synonym', 'ko-KR'),
  ('veg-mushroom', '버섯', '버섯', 'canonical', 'ko-KR'),
  ('dairy-butter', '버터', '버터', 'canonical', 'ko-KR'),
  ('meat-bacon', '베이컨', '베이컨', 'canonical', 'ko-KR'),
  ('proc-beans-can', '병아리콩', '병아리콩', 'synonym', 'ko-KR'),
  ('veg-garlic-chive', '부추', '부추', 'canonical', 'ko-KR'),
  ('sea-dried-pollack', '북어채', '북어채', 'synonym', 'ko-KR'),
  ('meat-beef-bulgogi', '불고기', '불고기', 'synonym', 'ko-KR'),
  ('meat-beef-bulgogi', '불고기용 소고기', '불고기용소고기', 'canonical', 'ko-KR'),
  ('veg-broccoli', '브로콜리', '브로콜리', 'canonical', 'ko-KR'),
  ('fruit-blueberry', '블루베리', '블루베리', 'canonical', 'ko-KR'),
  ('proc-jam', '블루베리잼', '블루베리잼', 'synonym', 'ko-KR'),
  ('meat-sausage', '비엔나', '비엔나', 'synonym', 'ko-KR'),
  ('veg-paprika', '빨강 파프리카', '빨강파프리카', 'synonym', 'ko-KR'),
  ('grain-breadcrumb', '빵가루', '빵가루', 'canonical', 'ko-KR'),
  ('fruit-apple', '사과', '사과', 'canonical', 'ko-KR'),
  ('misc-apple-juice', '사과주스', '사과주스', 'canonical', 'ko-KR'),
  ('veg-bracken', '삶은고사리', '삶은고사리', 'synonym', 'ko-KR'),
  ('meat-pork-belly', '삼겹살', '삼겹살', 'canonical', 'ko-KR'),
  ('veg-lettuce', '상추', '상추', 'canonical', 'ko-KR'),
  ('sea-shrimp', '새우', '새우', 'canonical', 'ko-KR'),
  ('misc-water', '생수', '생수', 'canonical', 'ko-KR'),
  ('sea-tuna', '생참치', '생참치', 'synonym', 'ko-KR'),
  ('dairy-whipping-cream', '생크림', '생크림', 'canonical', 'ko-KR'),
  ('season-sugar', '설탕', '설탕', 'canonical', 'ko-KR'),
  ('meat-beef', '소고기', '소고기', 'canonical', 'ko-KR'),
  ('meat-ground-beef', '소고기 다짐육', '소고기다짐육', 'synonym', 'ko-KR'),
  ('season-salt', '소금', '소금', 'canonical', 'ko-KR'),
  ('grain-somen', '소면', '소면', 'canonical', 'ko-KR'),
  ('meat-sausage', '소시지', '소시지', 'canonical', 'ko-KR'),
  ('veg-potato', '수미감자', '수미감자', 'synonym', 'ko-KR'),
  ('veg-sprout', '숙주', '숙주', 'canonical', 'ko-KR'),
  ('veg-sprout', '숙주나물', '숙주나물', 'synonym', 'ko-KR'),
  ('grain-pasta', '스파게티면', '스파게티면', 'synonym', 'ko-KR'),
  ('proc-spam', '스팸', '스팸', 'canonical', 'ko-KR'),
  ('dairy-cheese', '슬라이스치즈', '슬라이스치즈', 'synonym', 'ko-KR'),
  ('meat-ham', '슬라이스햄', '슬라이스햄', 'synonym', 'ko-KR'),
  ('veg-spinach', '시금치', '시금치', 'canonical', 'ko-KR'),
  ('grain-bread', '식빵', '식빵', 'canonical', 'ko-KR'),
  ('season-vinegar', '식초', '식초', 'canonical', 'ko-KR'),
  ('fruit-pear', '신고배', '신고배', 'synonym', 'ko-KR'),
  ('veg-chives', '실파', '실파', 'canonical', 'ko-KR'),
  ('grain-rice', '쌀', '쌀', 'canonical', 'ko-KR'),
  ('season-ssamjang', '쌈장', '쌈장', 'canonical', 'ko-KR'),
  ('misc-nuts', '아몬드', '아몬드', 'synonym', 'ko-KR'),
  ('fruit-avocado', '아보카도', '아보카도', 'canonical', 'ko-KR'),
  ('veg-young-napa', '알배기배추', '알배기배추', 'synonym', 'ko-KR'),
  ('veg-young-napa', '알배추', '알배추', 'canonical', 'ko-KR'),
  ('meat-pork', '앞다리살', '앞다리살', 'synonym', 'ko-KR'),
  ('veg-zucchini', '애호박', '애호박', 'canonical', 'ko-KR'),
  ('veg-cabbage', '양배추', '양배추', 'canonical', 'ko-KR'),
  ('veg-mushroom', '양송이버섯', '양송이버섯', 'synonym', 'ko-KR'),
  ('season-soy-dark', '양조간장', '양조간장', 'synonym', 'ko-KR'),
  ('veg-onion', '양파', '양파', 'canonical', 'ko-KR'),
  ('sea-fishcake', '어묵', '어묵', 'canonical', 'ko-KR'),
  ('season-mustard', '연겨자', '연겨자', 'synonym', 'ko-KR'),
  ('veg-lotus-root', '연근', '연근', 'canonical', 'ko-KR'),
  ('sea-salmon', '연어', '연어', 'canonical', 'ko-KR'),
  ('veg-garlic-chive', '영양부추', '영양부추', 'synonym', 'ko-KR'),
  ('fruit-orange', '오렌지', '오렌지', 'canonical', 'ko-KR'),
  ('misc-orange-juice', '오렌지주스', '오렌지주스', 'canonical', 'ko-KR'),
  ('meat-duck', '오리고기', '오리고기', 'canonical', 'ko-KR'),
  ('veg-cucumber', '오이', '오이', 'canonical', 'ko-KR'),
  ('sea-squid', '오징어', '오징어', 'canonical', 'ko-KR'),
  ('grain-oatmeal', '오트밀', '오트밀', 'canonical', 'ko-KR'),
  ('grain-starch', '옥수수전분', '옥수수전분', 'synonym', 'ko-KR'),
  ('proc-corn-can', '옥수수캔', '옥수수캔', 'canonical', 'ko-KR'),
  ('misc-syrup', '올리고당', '올리고당', 'canonical', 'ko-KR'),
  ('proc-olive', '올리브', '올리브', 'canonical', 'ko-KR'),
  ('dairy-yogurt', '요거트', '요거트', 'canonical', 'ko-KR'),
  ('season-cooking-wine', '요리술', '요리술', 'synonym', 'ko-KR'),
  ('grain-udon', '우동면', '우동면', 'canonical', 'ko-KR'),
  ('veg-burdock', '우엉', '우엉', 'canonical', 'ko-KR'),
  ('dairy-milk', '우유', '우유', 'canonical', 'ko-KR'),
  ('misc-coffee', '원두커피', '원두커피', 'synonym', 'ko-KR'),
  ('proc-stock', '육수팩', '육수팩', 'canonical', 'ko-KR'),
  ('grain-somen', '잔치국수면', '잔치국수면', 'synonym', 'ko-KR'),
  ('veg-chives', '잔파', '잔파', 'synonym', 'ko-KR'),
  ('proc-jam', '잼', '잼', 'canonical', 'ko-KR'),
  ('veg-onion', '적양파', '적양파', 'synonym', 'ko-KR'),
  ('grain-starch', '전분', '전분', 'canonical', 'ko-KR'),
  ('season-soy-soup', '조선간장', '조선간장', 'synonym', 'ko-KR'),
  ('veg-radish', '조선무', '조선무', 'synonym', 'ko-KR'),
  ('season-soy-dark', '진간장', '진간장', 'canonical', 'ko-KR'),
  ('veg-green-onion', '쪽파', '쪽파', 'synonym', 'ko-KR'),
  ('season-sesame-oil', '참기름', '참기름', 'canonical', 'ko-KR'),
  ('season-sesame-seed', '참깨', '참깨', 'synonym', 'ko-KR'),
  ('sea-tuna', '참치', '참치', 'canonical', 'ko-KR'),
  ('proc-tuna-can', '참치캔', '참치캔', 'canonical', 'ko-KR'),
  ('proc-tuna-can', '참치 통조림', '참치통조림', 'synonym', 'ko-KR'),
  ('veg-bok-choy', '청경채', '청경채', 'canonical', 'ko-KR'),
  ('veg-chili-pepper', '청양고추', '청양고추', 'synonym', 'ko-KR'),
  ('veg-tomato-cherry', '체리토마토', '체리토마토', 'synonym', 'ko-KR'),
  ('dairy-cheese', '치즈', '치즈', 'canonical', 'ko-KR'),
  ('season-chicken-stock', '치킨스톡', '치킨스톡', 'canonical', 'ko-KR'),
  ('season-curry', '카레가루', '카레가루', 'canonical', 'ko-KR'),
  ('misc-coffee', '커피', '커피', 'canonical', 'ko-KR'),
  ('season-ketchup', '케첩', '케첩', 'canonical', 'ko-KR'),
  ('misc-cocoa', '코코아가루', '코코아가루', 'canonical', 'ko-KR'),
  ('veg-bean-sprout', '콩나물', '콩나물', 'canonical', 'ko-KR'),
  ('proc-beans-can', '콩통조림', '콩통조림', 'canonical', 'ko-KR'),
  ('dairy-cream-cheese', '크림치즈', '크림치즈', 'canonical', 'ko-KR'),
  ('fruit-kiwi', '키위', '키위', 'canonical', 'ko-KR'),
  ('misc-sparkling-water', '탄산수', '탄산수', 'canonical', 'ko-KR'),
  ('proc-sauce-pasta', '토마토소스', '토마토소스', 'canonical', 'ko-KR'),
  ('proc-tomato-can', '토마토캔', '토마토캔', 'canonical', 'ko-KR'),
  ('season-ketchup', '토마토케첩', '토마토케첩', 'synonym', 'ko-KR'),
  ('season-sesame-seed', '통깨', '통깨', 'synonym', 'ko-KR'),
  ('veg-garlic', '통마늘', '통마늘', 'synonym', 'ko-KR'),
  ('misc-tea', '티백', '티백', 'canonical', 'ko-KR'),
  ('veg-green-onion', '파', '파', 'synonym', 'ko-KR'),
  ('dairy-parmesan', '파마산', '파마산', 'synonym', 'ko-KR'),
  ('dairy-parmesan', '파마산치즈', '파마산치즈', 'canonical', 'ko-KR'),
  ('grain-pasta', '파스타면', '파스타면', 'canonical', 'ko-KR'),
  ('proc-sauce-pasta', '파스타소스', '파스타소스', 'synonym', 'ko-KR'),
  ('fruit-pineapple', '파인애플', '파인애플', 'canonical', 'ko-KR'),
  ('veg-paprika', '파프리카', '파프리카', 'canonical', 'ko-KR'),
  ('fruit-grape', '포도', '포도', 'canonical', 'ko-KR'),
  ('veg-mushroom', '표고버섯', '표고버섯', 'synonym', 'ko-KR'),
  ('veg-chili-pepper', '풋고추', '풋고추', 'synonym', 'ko-KR'),
  ('dairy-yogurt', '플레인요거트', '플레인요거트', 'synonym', 'ko-KR'),
  ('proc-pickle', '피클', '피클', 'canonical', 'ko-KR'),
  ('meat-ham', '햄', '햄', 'canonical', 'ko-KR'),
  ('proc-spam', '햄통조림', '햄통조림', 'synonym', 'ko-KR'),
  ('grain-brown-rice', '현미', '현미', 'canonical', 'ko-KR'),
  ('misc-nuts', '호두', '호두', 'synonym', 'ko-KR'),
  ('veg-sweet-potato', '호박고구마', '호박고구마', 'synonym', 'ko-KR'),
  ('proc-tomato-can', '홀토마토', '홀토마토', 'synonym', 'ko-KR'),
  ('veg-chili-pepper', '홍고추', '홍고추', 'synonym', 'ko-KR'),
  ('misc-tea', '홍차', '홍차', 'synonym', 'ko-KR'),
  ('sea-dried-pollack', '황태채', '황태채', 'canonical', 'ko-KR'),
  ('season-pepper', '후추', '후추', 'canonical', 'ko-KR'),
  ('season-pepper', '후춧가루', '후춧가루', 'synonym', 'ko-KR'),
  ('dairy-whipping-cream', '휘핑크림', '휘핑크림', 'synonym', 'ko-KR'),
  ('veg-onion', '흰양파', '흰양파', 'synonym', 'ko-KR')
on conflict (locale, normalized_alias) do update
set ingredient_id = excluded.ingredient_id,
    alias = excluded.alias,
    alias_type = excluded.alias_type;

notify pgrst, 'reload schema';

-- PHASE1_RECIPE_V2_SCHEMA_END

-- PHASE2_API_FOUNDATION_SCHEMA_START

create table if not exists public.api_rate_limit_buckets (
  route_key text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (route_key, key_hash, window_start),
  constraint api_rate_limit_buckets_route_format
    check (route_key ~ '^[a-z0-9:_-]{1,80}$'),
  constraint api_rate_limit_buckets_hash_format
    check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint api_rate_limit_buckets_count_valid
    check (request_count >= 0),
  constraint api_rate_limit_buckets_expiry_valid
    check (expires_at > window_start)
);

create index if not exists idx_api_rate_limit_buckets_expires_at
on public.api_rate_limit_buckets(expires_at);

alter table public.api_rate_limit_buckets enable row level security;
revoke all on table public.api_rate_limit_buckets from public, anon, authenticated;
grant all on table public.api_rate_limit_buckets to service_role;

create or replace function public.consume_api_rate_limit(
  input_route_key text,
  input_key_hash text,
  request_limit integer,
  window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request_time timestamptz := clock_timestamp();
  bucket_start timestamptz;
  bucket_end timestamptz;
  current_count integer;
  retry_after integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if input_route_key is null or input_route_key !~ '^[a-z0-9:_-]{1,80}$' then
    raise exception 'invalid_route_key';
  end if;
  if input_key_hash is null or input_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_key_hash';
  end if;
  if request_limit < 1 or request_limit > 10000 then
    raise exception 'invalid_request_limit';
  end if;
  if window_seconds < 1 or window_seconds > 3600 then
    raise exception 'invalid_window_seconds';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from request_time) / window_seconds) * window_seconds
  );
  bucket_end := bucket_start + make_interval(secs => window_seconds);

  delete from public.api_rate_limit_buckets
  where expires_at < request_time;

  insert into public.api_rate_limit_buckets (
    route_key,
    key_hash,
    window_start,
    request_count,
    expires_at
  ) values (
    input_route_key,
    input_key_hash,
    bucket_start,
    1,
    bucket_end + make_interval(secs => window_seconds)
  )
  on conflict (route_key, key_hash, window_start)
  do update
  set request_count = public.api_rate_limit_buckets.request_count + 1,
      expires_at = excluded.expires_at,
      updated_at = request_time
  returning request_count into current_count;

  retry_after := greatest(1, ceil(extract(epoch from bucket_end - request_time))::integer);

  return jsonb_build_object(
    'allowed', current_count <= request_limit,
    'remaining', greatest(request_limit - current_count, 0),
    'retryAfter', retry_after,
    'limit', request_limit,
    'windowSeconds', window_seconds
  );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
to service_role;

comment on table public.api_rate_limit_buckets is
  'HMAC-pseudonymized, service-role-only fixed-window counters shared across server instances.';

notify pgrst, 'reload schema';

-- PHASE2_API_FOUNDATION_SCHEMA_END
