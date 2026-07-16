-- 이 migration은 사용자별 실제 주간 식단과 아침·점심·저녁 슬롯을 추가합니다.
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_plans_user_week_unique unique (user_id, week_start),
  constraint meal_plans_timezone_length check (char_length(timezone) between 1 and 80)
);

create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  meal_date date not null,
  meal_type text not null,
  entry_kind text not null,
  recipe_id uuid references public.recipes(id) on delete set null,
  title text not null,
  servings integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_plan_items_slot_unique unique (meal_plan_id, meal_date, meal_type),
  constraint meal_plan_items_type_allowed check (meal_type in ('breakfast', 'lunch', 'dinner')),
  constraint meal_plan_items_kind_allowed check (entry_kind in ('recipe', 'leftovers', 'dining_out', 'delivery', 'custom')),
  constraint meal_plan_items_recipe_shape check (
    (entry_kind = 'recipe' and recipe_id is not null)
    or (entry_kind <> 'recipe' and recipe_id is null)
  ),
  constraint meal_plan_items_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint meal_plan_items_servings_range check (servings between 1 and 12)
);

create index if not exists idx_meal_plans_user_week on public.meal_plans(user_id, week_start desc);
create index if not exists idx_meal_plan_items_plan_date on public.meal_plan_items(meal_plan_id, meal_date, meal_type);

drop trigger if exists set_meal_plans_updated_at on public.meal_plans;
create trigger set_meal_plans_updated_at before update on public.meal_plans
for each row execute function public.set_updated_at();
drop trigger if exists set_meal_plan_items_updated_at on public.meal_plan_items;
create trigger set_meal_plan_items_updated_at before update on public.meal_plan_items
for each row execute function public.set_updated_at();

alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;

revoke all on table public.meal_plans from anon, authenticated;
revoke all on table public.meal_plan_items from anon, authenticated;
grant all on table public.meal_plans to service_role;
grant all on table public.meal_plan_items to service_role;

create or replace function public.replace_meal_plan_items(input_plan_id uuid, input_items jsonb)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  plan_week_start date;
begin
  if jsonb_typeof(input_items) <> 'array' or jsonb_array_length(input_items) > 21 then
    raise exception 'invalid_meal_plan_items';
  end if;

  select week_start into plan_week_start
  from public.meal_plans
  where id = input_plan_id;
  if plan_week_start is null then
    raise exception 'meal_plan_not_found';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(input_items) as checked(meal_date date)
    where checked.meal_date < plan_week_start
       or checked.meal_date > plan_week_start + 6
  ) then
    raise exception 'meal_plan_date_out_of_range';
  end if;

  delete from public.meal_plan_items where meal_plan_id = input_plan_id;
  insert into public.meal_plan_items (
    meal_plan_id, meal_date, meal_type, entry_kind, recipe_id, title, servings
  )
  select
    input_plan_id,
    item.meal_date,
    item.meal_type,
    item.entry_kind,
    item.recipe_id,
    item.title,
    item.servings
  from jsonb_to_recordset(input_items) as item(
    meal_date date,
    meal_type text,
    entry_kind text,
    recipe_id uuid,
    title text,
    servings integer
  );
end;
$$;

revoke all on function public.replace_meal_plan_items(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_meal_plan_items(uuid, jsonb) to service_role;

comment on table public.meal_plans is 'Private persisted weekly meal plans. Family sharing requires a later explicit scope migration.';
comment on function public.replace_meal_plan_items(uuid, jsonb) is 'Atomically replaces one validated personal meal plan through the service role API.';

notify pgrst, 'reload schema';
