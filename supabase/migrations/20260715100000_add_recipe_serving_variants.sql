alter table public.recipes
  add column if not exists serving_variants jsonb not null default '[]'::jsonb;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_serving_variants_shape'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipe_serving_variants_shape
      check (
        jsonb_typeof(serving_variants) = 'array'
        and jsonb_array_length(serving_variants) between 0 and 20
        and (
          jsonb_array_length(serving_variants) = 0
          or jsonb_array_length(serving_variants) >= 2
        )
      );
  end if;
end
$migration$;

alter table public.recipes enable row level security;
revoke all on table public.recipes from public, anon, authenticated;
grant select on table public.recipes to service_role;

comment on column public.recipes.serving_variants is
  'Editor-reviewed exact ingredient quantities plus tool and time guidance for each selectable serving count. Empty means the serving selector is not publication-ready.';

notify pgrst, 'reload schema';
