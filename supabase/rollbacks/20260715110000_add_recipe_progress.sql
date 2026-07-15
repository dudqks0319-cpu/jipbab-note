revoke all on table public.recipe_progress from public, anon, authenticated, service_role;
revoke all on function public.recipe_progress_steps_are_canonical(smallint[])
from public, anon, authenticated, service_role;
revoke all on function public.set_recipe_progress_updated_at()
from public, anon, authenticated, service_role;

comment on table public.recipe_progress is
  'Rollback retained private cook progress with every runtime role revoked.';

notify pgrst, 'reload schema';
