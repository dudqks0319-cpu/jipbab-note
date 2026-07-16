revoke all on function public.restore_recipe_version(uuid, integer, integer, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.capture_recipe_version(uuid, integer, text, uuid) from public, anon, authenticated, service_role;
revoke all on function app.build_recipe_v2_snapshot(uuid) from public, anon, authenticated, service_role;

drop function if exists public.restore_recipe_version(uuid, integer, integer, text, uuid);
drop function if exists public.capture_recipe_version(uuid, integer, text, uuid);
drop function if exists app.build_recipe_v2_snapshot(uuid);

revoke all on table public.ingredients_catalog from anon, authenticated;
revoke all on table public.ingredient_aliases from anon, authenticated;
revoke all on table public.recipe_ingredients from anon, authenticated;
revoke all on table public.recipe_ingredient_substitutions from anon, authenticated;
revoke all on table public.recipe_steps from anon, authenticated;
revoke all on table public.recipe_step_ingredients from anon, authenticated;
revoke all on table public.recipe_reviews from anon, authenticated;
revoke all on table public.recipe_versions from anon, authenticated;

update public.recipes
set schema_version = 1
where schema_version = 2;

comment on table public.recipe_versions is
  'Phase 1 rollback preserved snapshots. Mutation RPCs are disabled; export and inspect data before any destructive cleanup.';

notify pgrst, 'reload schema';
