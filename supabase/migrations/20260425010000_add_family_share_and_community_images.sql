-- 가족 냉장고 공유와 커뮤니티 이미지 업로드를 위한 테이블/정책입니다.

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

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_family_groups_updated_at'
      and tgrelid = 'public.family_groups'::regclass
  ) then
    create trigger set_family_groups_updated_at
    before update on public.family_groups
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'set_family_members_updated_at'
      and tgrelid = 'public.family_members'::regclass
  ) then
    create trigger set_family_members_updated_at
    before update on public.family_members
    for each row execute function public.set_updated_at();
  end if;
end
$$;

alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;

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
        (auth.uid() is not null and m.user_id = auth.uid())
        or (auth.uid() is null and m.user_id is null and m.device_id = app.current_device_id())
      )
  )
);

drop policy if exists family_groups_insert_owner on public.family_groups;
create policy family_groups_insert_owner
on public.family_groups
for insert
with check (
  (auth.uid() is not null and owner_user_id = auth.uid())
  or (auth.uid() is null and owner_user_id is null and owner_device_id = app.current_device_id())
);

drop policy if exists family_groups_update_owner on public.family_groups;
create policy family_groups_update_owner
on public.family_groups
for update
using (
  (auth.uid() is not null and owner_user_id = auth.uid())
  or (auth.uid() is null and owner_user_id is null and owner_device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and owner_user_id = auth.uid())
  or (auth.uid() is null and owner_user_id is null and owner_device_id = app.current_device_id())
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
        (auth.uid() is not null and viewer.user_id = auth.uid())
        or (auth.uid() is null and viewer.user_id is null and viewer.device_id = app.current_device_id())
      )
  )
);

drop policy if exists family_members_insert_self_or_owner on public.family_members;
create policy family_members_insert_self_or_owner
on public.family_members
for insert
with check (
  (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
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
  (auth.uid() is not null and user_id = auth.uid())
  or (auth.uid() is null and user_id is null and device_id = app.current_device_id())
  or exists (
    select 1
    from public.family_groups g
    where g.id = family_members.family_group_id
      and (
        (auth.uid() is not null and g.owner_user_id = auth.uid())
        or (auth.uid() is null and g.owner_user_id is null and g.owner_device_id = app.current_device_id())
      )
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
    auth.uid() is not null
    or app.current_device_id() is not null
  )
);
