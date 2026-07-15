create or replace function public.recipe_progress_steps_are_canonical(step_indexes smallint[])
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $function$
  select
    cardinality(step_indexes) <= 100
    and coalesce(
      (select bool_and(step_index between 1 and 100) from unnest(step_indexes) as step_index),
      true
    )
    and step_indexes = coalesce(
      (
        select array_agg(distinct step_index order by step_index)
        from unnest(step_indexes) as step_index
      ),
      '{}'::smallint[]
    );
$function$;

revoke all on function public.recipe_progress_steps_are_canonical(smallint[])
from public, anon, authenticated;
grant execute on function public.recipe_progress_steps_are_canonical(smallint[])
to service_role;

create table if not exists public.recipe_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  recipe_version integer not null,
  servings smallint not null,
  active_step_index smallint not null,
  checked_step_indexes smallint[] not null default '{}'::smallint[],
  timer_step_index smallint,
  timer_ends_at timestamptz,
  timer_duration_seconds integer,
  started_at timestamptz,
  completed_at timestamptz,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint recipe_progress_recipe_version_valid
    check (recipe_version between 1 and 1000000),
  constraint recipe_progress_servings_valid
    check (servings between 1 and 20),
  constraint recipe_progress_active_step_valid
    check (active_step_index between 0 and 99),
  constraint recipe_progress_checked_steps_canonical
    check (public.recipe_progress_steps_are_canonical(checked_step_indexes)),
  constraint recipe_progress_timer_fields_consistent
    check (
      (
        timer_step_index is null
        and timer_ends_at is null
        and timer_duration_seconds is null
      )
      or (
        timer_step_index between 1 and 100
        and timer_ends_at is not null
        and timer_duration_seconds between 1 and 86400
      )
    ),
  constraint recipe_progress_completion_time_valid
    check (started_at is null or completed_at is null or completed_at >= started_at),
  constraint recipe_progress_user_recipe_servings_unique
    unique (user_id, recipe_id, servings)
);

create index if not exists idx_recipe_progress_user_updated
on public.recipe_progress(user_id, updated_at desc);

create index if not exists idx_recipe_progress_recipe_updated
on public.recipe_progress(recipe_id, updated_at desc);

create or replace function public.set_recipe_progress_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$function$;

revoke all on function public.set_recipe_progress_updated_at()
from public, anon, authenticated;
grant execute on function public.set_recipe_progress_updated_at()
to service_role;

drop trigger if exists recipe_progress_set_updated_at on public.recipe_progress;
create trigger recipe_progress_set_updated_at
before update on public.recipe_progress
for each row execute function public.set_recipe_progress_updated_at();

alter table public.recipe_progress enable row level security;
revoke all on table public.recipe_progress from public, anon, authenticated;
grant select, insert, update on table public.recipe_progress to service_role;

comment on table public.recipe_progress is
  'Private per-user cook progress. App roles cannot access rows directly.';
comment on column public.recipe_progress.client_updated_at is
  'Untrusted client timestamp retained only for merge presentation; updated_at is server-owned.';

notify pgrst, 'reload schema';
