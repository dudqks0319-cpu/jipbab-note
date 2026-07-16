-- 가족 감사 이력은 삭제하지 않고 Realtime과 쓰기 권한을 차단합니다.
do $$
begin
  alter publication supabase_realtime drop table public.family_activity_events;
exception
  when undefined_object then null;
end $$;
revoke all on function public.leave_family_group(uuid) from public, anon, authenticated;
revoke all on table public.family_activity_events from public, anon, authenticated, service_role;
comment on table public.family_activity_events is
  'Rollback quarantine: preserve family activity evidence and remove all access.';
notify pgrst, 'reload schema';
