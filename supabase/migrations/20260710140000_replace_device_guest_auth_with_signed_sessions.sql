create or replace function app.current_device_id()
returns text
language sql
stable
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
