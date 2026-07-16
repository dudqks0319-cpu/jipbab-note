-- 구조화 알레르기 증거는 보존하고 앱 역할 및 service role 변경 권한만 차단합니다.
revoke all on table public.ingredient_allergen_links from public, anon, authenticated, service_role;
revoke all on table public.ingredient_allergen_profiles from public, anon, authenticated, service_role;
revoke all on table public.allergen_groups from public, anon, authenticated, service_role;

comment on table public.ingredient_allergen_profiles is
  'Rollback preserved allergen review evidence. Restore service-role grants only after application compatibility is verified.';

notify pgrst, 'reload schema';
