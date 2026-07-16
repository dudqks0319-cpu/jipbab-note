-- 오류 신고 증거를 보존하고 새 접수만 차단합니다.
revoke all on table public.recipe_issue_reports from public, anon, authenticated, service_role;

comment on table public.recipe_issue_reports is
  'Rollback preserved issue evidence. Restore grants only after application compatibility is verified.';

notify pgrst, 'reload schema';
