begin;

alter function app.current_device_id()
set search_path = pg_catalog;

alter function app.is_permanent_user()
set search_path = pg_catalog, auth;

revoke all on function app.current_device_id()
from public, anon, authenticated, service_role;

revoke all on function app.is_permanent_user()
from public, anon, authenticated, service_role;
grant execute on function app.is_permanent_user() to authenticated;

commit;

notify pgrst, 'reload schema';
