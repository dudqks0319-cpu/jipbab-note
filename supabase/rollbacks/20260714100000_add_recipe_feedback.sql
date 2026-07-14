revoke all on table public.recipe_feedback from public, anon, authenticated, service_role;
comment on table public.recipe_feedback is
  'Rollback retained private feedback evidence with every runtime role revoked.';

notify pgrst, 'reload schema';
