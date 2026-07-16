-- 식단 원자료를 보존하고 앱 역할 및 API 교체 함수의 접근만 차단합니다.
revoke all on table public.meal_plans from public, anon, authenticated, service_role;
revoke all on table public.meal_plan_items from public, anon, authenticated, service_role;
revoke all on function public.replace_meal_plan_items(uuid, jsonb) from public, anon, authenticated, service_role;

comment on table public.meal_plans is 'Rollback preserved private meal plan evidence. Restore access only after compatibility is verified.';

notify pgrst, 'reload schema';
