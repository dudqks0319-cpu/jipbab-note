-- 가족 냉장고, 커뮤니티 첨부, 레시피 채택 동의 기능을 추가합니다.

create table if not exists public.family_fridges (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  owner_user_id uuid null references auth.users(id) on delete set null,
  owner_device_id text not null,
  name text not null default '우리집 냉장고',
  created_at timestamptz not null default now()
);

create table if not exists public.family_fridge_members (
  id uuid primary key default gen_random_uuid(),
  family_fridge_id uuid not null references public.family_fridges(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete cascade,
  device_id text not null,
  display_name text not null default '가족',
  created_at timestamptz not null default now()
);

alter table public.ingredients
add column if not exists family_fridge_id uuid null references public.family_fridges(id) on delete set null;

alter table public.community_posts
add column if not exists post_type text not null default 'story',
add column if not exists image_url text null,
add column if not exists link_url text null,
add column if not exists recipe_id uuid null references public.recipes(id) on delete set null,
add column if not exists consent_recipe_use boolean not null default false,
add column if not exists adopted_at timestamptz null;

create index if not exists idx_ingredients_family_fridge_id on public.ingredients(family_fridge_id);
create index if not exists idx_family_fridges_invite_code on public.family_fridges(invite_code);
create index if not exists idx_family_members_family_fridge_id on public.family_fridge_members(family_fridge_id);
create index if not exists idx_family_members_device_id on public.family_fridge_members(device_id);
create index if not exists idx_family_members_user_id on public.family_fridge_members(user_id);
create index if not exists idx_community_posts_post_type on public.community_posts(post_type);
create index if not exists idx_community_posts_recipe_id on public.community_posts(recipe_id);

create unique index if not exists family_members_user_unique
on public.family_fridge_members(family_fridge_id, user_id)
where user_id is not null;

create unique index if not exists family_members_device_unique
on public.family_fridge_members(family_fridge_id, device_id)
where user_id is null;

alter table public.family_fridges enable row level security;
alter table public.family_fridge_members enable row level security;

drop policy if exists ingredients_select_own on public.ingredients;
create policy ingredients_select_own
on public.ingredients
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
  or exists (
    select 1
    from public.family_fridge_members member
    where member.family_fridge_id = ingredients.family_fridge_id
      and (
        (auth.uid() is not null and member.user_id = auth.uid())
        or member.device_id = app.current_device_id()
      )
  )
);

drop policy if exists ingredients_insert_own on public.ingredients;
create policy ingredients_insert_own
on public.ingredients
for insert
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
  or exists (
    select 1
    from public.family_fridge_members member
    where member.family_fridge_id = ingredients.family_fridge_id
      and (
        (auth.uid() is not null and member.user_id = auth.uid())
        or member.device_id = app.current_device_id()
      )
  )
);

drop policy if exists ingredients_update_own on public.ingredients;
create policy ingredients_update_own
on public.ingredients
for update
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
  or exists (
    select 1
    from public.family_fridge_members member
    where member.family_fridge_id = ingredients.family_fridge_id
      and (
        (auth.uid() is not null and member.user_id = auth.uid())
        or member.device_id = app.current_device_id()
      )
  )
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
  or exists (
    select 1
    from public.family_fridge_members member
    where member.family_fridge_id = ingredients.family_fridge_id
      and (
        (auth.uid() is not null and member.user_id = auth.uid())
        or member.device_id = app.current_device_id()
      )
  )
);

drop policy if exists ingredients_delete_own on public.ingredients;
create policy ingredients_delete_own
on public.ingredients
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
  or exists (
    select 1
    from public.family_fridge_members member
    where member.family_fridge_id = ingredients.family_fridge_id
      and (
        (auth.uid() is not null and member.user_id = auth.uid())
        or member.device_id = app.current_device_id()
      )
  )
);

drop policy if exists family_fridges_select_member on public.family_fridges;
create policy family_fridges_select_member
on public.family_fridges
for select
using (
  exists (
    select 1
    from public.family_fridge_members member
    where member.family_fridge_id = family_fridges.id
      and (
        (auth.uid() is not null and member.user_id = auth.uid())
        or member.device_id = app.current_device_id()
      )
  )
);

drop policy if exists family_fridges_insert_own on public.family_fridges;
create policy family_fridges_insert_own
on public.family_fridges
for insert
with check (
  (auth.uid() is not null and owner_user_id = auth.uid())
  or owner_device_id = app.current_device_id()
);

drop policy if exists family_members_select_member on public.family_fridge_members;
create policy family_members_select_member
on public.family_fridge_members
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or device_id = app.current_device_id()
  or exists (
    select 1
    from public.family_fridge_members viewer
    where viewer.family_fridge_id = family_fridge_members.family_fridge_id
      and (
        (auth.uid() is not null and viewer.user_id = auth.uid())
        or viewer.device_id = app.current_device_id()
      )
  )
);

drop policy if exists family_members_insert_self_with_limit on public.family_fridge_members;
create policy family_members_insert_self_with_limit
on public.family_fridge_members
for insert
with check (
  (
    (auth.uid() is not null and user_id = auth.uid())
    or device_id = app.current_device_id()
  )
  and (
    select count(*)
    from public.family_fridge_members existing
    where existing.family_fridge_id = family_fridge_members.family_fridge_id
  ) < 4
);

drop policy if exists family_members_delete_self on public.family_fridge_members;
create policy family_members_delete_self
on public.family_fridge_members
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or device_id = app.current_device_id()
);
