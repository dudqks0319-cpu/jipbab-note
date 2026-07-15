revoke all on table public.ingredients_catalog from anon, authenticated;
revoke all on table public.ingredient_aliases from anon, authenticated;
comment on table public.ingredients_catalog is
  'Phase 1 rollback retained the app-owned catalog because normalized recipe rows may reference it.';
notify pgrst, 'reload schema';
