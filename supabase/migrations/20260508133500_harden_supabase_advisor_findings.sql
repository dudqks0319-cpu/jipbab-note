-- Supabase advisor 보안 경고를 출시 기준으로 정리합니다.

alter function public.set_updated_at()
set search_path = pg_catalog, public;

alter function app.request_header(text)
set search_path = pg_catalog, app;

alter function app.current_device_id()
set search_path = pg_catalog, app, auth;

-- rls_auto_enable은 운영 자동화/점검용 SECURITY DEFINER 함수이므로
-- public API 역할에서 직접 호출할 수 없게 막습니다.
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

-- public bucket은 객체 URL 접근에 broad SELECT 정책이 필요하지 않습니다.
drop policy if exists community_images_select_public on storage.objects;
