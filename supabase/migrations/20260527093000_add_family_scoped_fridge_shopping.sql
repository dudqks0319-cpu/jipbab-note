-- 가족 냉장고/장보기 scope를 기존 개인 데이터와 분리합니다.
-- 기존 정책을 약화하지 않고, family_group_id가 있는 row는 가족 구성원만 읽고 쓸 수 있게 합니다.

alter table public.ingredients
add column if not exists family_group_id uuid null references public.family_groups(id) on delete cascade;

alter table public.shopping_items
add column if not exists family_group_id uuid null references public.family_groups(id) on delete cascade;

create index if not exists idx_ingredients_family_group_id on public.ingredients(family_group_id);
create index if not exists idx_shopping_items_family_group_id on public.shopping_items(family_group_id);

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
