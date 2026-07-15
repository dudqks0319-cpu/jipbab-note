revoke all on table public.recipes from public, anon, authenticated, service_role;

comment on column public.recipes.serving_variants is
  'Rollback retained reviewed serving variants and revoked runtime recipe access until a forward migration is approved.';

notify pgrst, 'reload schema';
