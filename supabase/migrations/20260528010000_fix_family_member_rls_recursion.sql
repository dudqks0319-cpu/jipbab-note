-- Fix family member RLS recursion introduced by policies that queried family_members
-- from inside family_members-dependent policies.
-- The helper functions are security definer so policy checks can test membership
-- without recursively applying family_members RLS to itself.

create or replace function public.is_current_family_member(group_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    group_id_input is not null
    and exists (
      select 1
      from public.family_members m
      where m.family_group_id = group_id_input
        and (
          (auth.uid() is not null and m.user_id = auth.uid())
          or (
            auth.uid() is null
            and m.user_id is null
            and m.device_id = app.current_device_id()
          )
        )
    );
$$;

create or replace function public.is_current_family_group_owner(group_id_input uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    group_id_input is not null
    and exists (
      select 1
      from public.family_groups g
      where g.id = group_id_input
        and (
          (auth.uid() is not null and g.owner_user_id = auth.uid())
          or (
            auth.uid() is null
            and g.owner_user_id is null
            and g.owner_device_id = app.current_device_id()
          )
        )
    );
$$;

create or replace function public.family_group_member_count(group_id_input uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.family_members m
  where m.family_group_id = group_id_input;
$$;

revoke all on function public.is_current_family_member(uuid) from public;
revoke all on function public.is_current_family_group_owner(uuid) from public;
revoke all on function public.family_group_member_count(uuid) from public;
grant execute on function public.is_current_family_member(uuid) to anon, authenticated;
grant execute on function public.is_current_family_group_owner(uuid) to anon, authenticated;
grant execute on function public.family_group_member_count(uuid) to anon, authenticated;

drop policy if exists family_groups_select_member on public.family_groups;
create policy family_groups_select_member
on public.family_groups
for select
using (public.is_current_family_member(family_groups.id));

drop policy if exists family_members_select_same_group on public.family_members;
create policy family_members_select_same_group
on public.family_members
for select
using (public.is_current_family_member(family_members.family_group_id));

drop policy if exists family_members_insert_self_or_owner on public.family_members;
create policy family_members_insert_self_or_owner
on public.family_members
for insert
with check (
  (
    ((select auth.uid()) is not null and user_id = (select auth.uid()))
    or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
  )
  and public.family_group_member_count(family_group_id) < 4
  and (
    role = 'member'
    or public.is_current_family_group_owner(family_group_id)
    or public.family_group_member_count(family_group_id) = 0
  )
);

drop policy if exists family_members_delete_self_or_owner on public.family_members;
create policy family_members_delete_self_or_owner
on public.family_members
for delete
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or ((select auth.uid()) is null and user_id is null and device_id = (select app.current_device_id()))
  or public.is_current_family_group_owner(family_members.family_group_id)
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
    and public.is_current_family_member(ingredients.family_group_id)
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
    and public.is_current_family_member(ingredients.family_group_id)
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
    and public.is_current_family_member(ingredients.family_group_id)
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
    and public.is_current_family_member(ingredients.family_group_id)
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
    and public.is_current_family_member(ingredients.family_group_id)
  )
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
    and public.is_current_family_member(shopping_items.family_group_id)
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
    and public.is_current_family_member(shopping_items.family_group_id)
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
    and public.is_current_family_member(shopping_items.family_group_id)
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
    and public.is_current_family_member(shopping_items.family_group_id)
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
    and public.is_current_family_member(shopping_items.family_group_id)
  )
);
