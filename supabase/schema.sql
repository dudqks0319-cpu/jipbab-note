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
  thumbnail_url text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source_id uuid,
  content_origin text check (content_origin is null or content_origin in ('original', 'public_api', 'licensed', 'user_bookmark')),
  reviewed_for_beginner boolean not null default false,
  source text,
  created_at timestamptz not null default now()
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

drop policy if exists recipe_sources_select_public on public.recipe_sources;
create policy recipe_sources_select_public
on public.recipe_sources
for select
using (true);

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
