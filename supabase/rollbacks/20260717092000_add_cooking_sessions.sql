-- 조리 완료 원자료를 보존하고 새 저장만 차단합니다.
revoke all on table public.cooking_sessions from public, anon, authenticated, service_role;

comment on table public.cooking_sessions is
  'Rollback preserved private cooking evidence. Restore grants only after application compatibility is verified.';

notify pgrst, 'reload schema';
