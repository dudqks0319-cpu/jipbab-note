-- 운영 증거 보존을 위해 오류 신고 처리 데이터는 삭제하지 않고 접근만 차단합니다.
revoke all on table public.recipe_issue_report_events from public, anon, authenticated, service_role;
revoke all on function public.transition_recipe_issue_report(uuid, text, text, text, text, uuid)
from public, anon, authenticated, service_role;
comment on table public.recipe_issue_report_events is
  'Rollback quarantine: preserve recipe issue audit evidence and remove all grants.';
comment on column public.recipe_issue_reports.resolution_recipe_version_id is
  'Rollback quarantine: retained for audit integrity; admin write path must be disabled.';
notify pgrst, 'reload schema';
