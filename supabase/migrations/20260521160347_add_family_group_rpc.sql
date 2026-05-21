-- 가족 냉장고 생성/초대코드 참여를 DB 트랜잭션 안에서 처리합니다.

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
set search_path = public, app, pg_temp
as $$
declare
  acting_user_id uuid := (select auth.uid());
  acting_device_id text := (select app.current_device_id());
  normalized_group_name text := left(trim(coalesce(group_name_input, '')), 40);
  normalized_invite_code text := upper(trim(coalesce(invite_code_input, '')));
  normalized_owner_name text := left(trim(coalesce(owner_display_name_input, '')), 24);
  inserted_created_at timestamptz;
  inserted_updated_at timestamptz;
begin
  if group_id_input is null then
    raise exception 'invalid_family_group_id';
  end if;

  if acting_device_id is null or length(trim(acting_device_id)) = 0 then
    raise exception 'missing_device_id';
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
    id,
    owner_user_id,
    owner_device_id,
    name,
    invite_code
  )
  values (
    group_id_input,
    acting_user_id,
    acting_device_id,
    normalized_group_name,
    normalized_invite_code
  )
  returning family_groups.created_at, family_groups.updated_at
  into inserted_created_at, inserted_updated_at;

  insert into public.family_members (
    family_group_id,
    user_id,
    device_id,
    display_name,
    role
  )
  values (
    group_id_input,
    acting_user_id,
    acting_device_id,
    normalized_owner_name,
    'owner'
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
set search_path = public, app, pg_temp
as $$
declare
  acting_user_id uuid := (select auth.uid());
  acting_device_id text := (select app.current_device_id());
  normalized_invite_code text := upper(trim(coalesce(invite_code_input, '')));
  normalized_display_name text := left(trim(coalesce(display_name_input, '')), 24);
  matched_group public.family_groups%rowtype;
  existing_member_id uuid;
  existing_member_role text;
  current_member_count integer;
  owner_display_name text;
begin
  if acting_device_id is null or length(trim(acting_device_id)) = 0 then
    raise exception 'missing_device_id';
  end if;

  if length(normalized_display_name) = 0 then
    normalized_display_name := '가족';
  end if;

  if normalized_invite_code !~ '^[A-Z0-9]{4,12}$' then
    raise exception 'invalid_invite_code';
  end if;

  select *
  into matched_group
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
    and (
      (acting_user_id is not null and m.user_id = acting_user_id)
      or (acting_user_id is null and m.user_id is null and m.device_id = acting_device_id)
    )
  limit 1;

  if existing_member_id is null then
    select count(*)::integer
    into current_member_count
    from public.family_members m
    where m.family_group_id = matched_group.id;

    if current_member_count >= 4 then
      raise exception 'family_group_full';
    end if;

    insert into public.family_members (
      family_group_id,
      user_id,
      device_id,
      display_name,
      role
    )
    values (
      matched_group.id,
      acting_user_id,
      acting_device_id,
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

  select owner.display_name
  into owner_display_name
  from public.family_members owner
  where owner.family_group_id = matched_group.id
    and owner.role = 'owner'
  order by owner.created_at asc
  limit 1;

  select count(*)::integer
  into member_count
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

create or replace function public.get_family_group_members(
  group_id_input uuid
)
returns table (
  member_id uuid,
  device_id text,
  display_name text,
  role text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  acting_user_id uuid := (select auth.uid());
  acting_device_id text := (select app.current_device_id());
begin
  if group_id_input is null then
    raise exception 'invalid_family_group_id';
  end if;

  if acting_device_id is null or length(trim(acting_device_id)) = 0 then
    raise exception 'missing_device_id';
  end if;

  if not exists (
    select 1
    from public.family_members viewer
    where viewer.family_group_id = group_id_input
      and (
        (acting_user_id is not null and viewer.user_id = acting_user_id)
        or (acting_user_id is null and viewer.user_id is null and viewer.device_id = acting_device_id)
      )
  ) then
    raise exception 'family_group_access_denied';
  end if;

  return query
  select
    m.id as member_id,
    m.device_id,
    m.display_name,
    m.role,
    m.created_at as joined_at
  from public.family_members m
  where m.family_group_id = group_id_input
  order by m.created_at asc;
end;
$$;

revoke all on function public.create_family_group(uuid, text, text, text) from public;
revoke all on function public.join_family_group_by_invite_code(text, text) from public;
revoke all on function public.get_family_group_members(uuid) from public;
grant execute on function public.create_family_group(uuid, text, text, text) to anon, authenticated;
grant execute on function public.join_family_group_by_invite_code(text, text) to anon, authenticated;
grant execute on function public.get_family_group_members(uuid) to anon, authenticated;
