-- 장보기 목록을 계정/디바이스 기준으로 동기화하기 위한 shopping_items 테이블을 추가합니다.

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  user_id uuid null references auth.users(id) on delete cascade,
  name text not null,
  quantity text,
  category text,
  checked boolean not null default false,
  source_recipe_id text,
  source_recipe_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shopping_items_device_id on public.shopping_items(device_id);
create index if not exists idx_shopping_items_user_id on public.shopping_items(user_id);
create index if not exists idx_shopping_items_checked on public.shopping_items(checked);
create index if not exists idx_shopping_items_created_at on public.shopping_items(created_at desc);

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

alter table public.shopping_items enable row level security;

drop policy if exists shopping_items_select_own on public.shopping_items;
create policy shopping_items_select_own
on public.shopping_items
for select
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists shopping_items_insert_own on public.shopping_items;
create policy shopping_items_insert_own
on public.shopping_items
for insert
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists shopping_items_update_own on public.shopping_items;
create policy shopping_items_update_own
on public.shopping_items
for update
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
)
with check (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);

drop policy if exists shopping_items_delete_own on public.shopping_items;
create policy shopping_items_delete_own
on public.shopping_items
for delete
using (
  (auth.uid() is not null and user_id = auth.uid())
  or (device_id = app.current_device_id())
);
