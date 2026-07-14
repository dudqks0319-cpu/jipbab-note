revoke all on table public.recipe_feedback from public, anon, authenticated, service_role;
comment on table public.recipe_feedback is
  'Completion-detail rollback retained private feedback evidence and revoked every runtime role.';

notify pgrst, 'reload schema';
