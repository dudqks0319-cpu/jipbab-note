begin;

-- Security hardening is not rolled back by restoring broad EXECUTE grants.
-- This emergency rollback disables user-facing and server mutation RPCs while
-- preserving the auth-user deletion trigger and all stored data.
revoke all on function public.create_family_group(uuid, text, text, text)
from public, anon, authenticated;
revoke all on function public.join_family_group_by_invite_code(text, text)
from public, anon, authenticated;
revoke all on function public.get_family_group_members(uuid)
from public, anon, authenticated;

revoke all on function public.merge_anonymous_user_data(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function app.build_recipe_v2_snapshot(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.capture_recipe_version(uuid, integer, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.restore_recipe_version(uuid, integer, integer, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
from public, anon, authenticated, service_role;

alter function public.handle_user_deletion()
set search_path = pg_catalog, public, auth;
revoke all on function public.handle_user_deletion()
from public, anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
