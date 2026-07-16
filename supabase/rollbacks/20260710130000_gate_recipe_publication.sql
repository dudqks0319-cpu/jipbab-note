begin;

drop policy if exists recipe_sources_select_public on public.recipe_sources;
create policy recipe_sources_select_public
on public.recipe_sources
for select
to anon, authenticated
using (false);

drop policy if exists recipes_select_public on public.recipes;
create policy recipes_select_public
on public.recipes
for select
to anon, authenticated
using (false);

drop index if exists public.idx_recipes_publication_ready;

commit;

notify pgrst, 'reload schema';
