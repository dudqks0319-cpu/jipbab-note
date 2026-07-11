begin;

-- Trigger-only cleanup. Direct invocation is never required by an app role.
alter function public.handle_user_deletion()
set search_path = pg_catalog, public, auth;
revoke all on function public.handle_user_deletion()
from public, anon, authenticated, service_role;

-- These helpers are evaluated from authenticated RLS policies. Keep only the
-- authenticated grant and put trusted schemas before pg_temp.
alter function public.is_current_family_member(uuid)
set search_path = pg_catalog, public, app, auth, pg_temp;
alter function public.is_current_family_group_owner(uuid)
set search_path = pg_catalog, public, app, auth, pg_temp;

revoke all on function public.is_current_family_member(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.is_current_family_group_owner(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.is_current_family_member(uuid) to authenticated;
grant execute on function public.is_current_family_group_owner(uuid) to authenticated;

-- The signed-session migration no longer references this legacy helper.
drop function if exists public.family_group_member_count(uuid);

-- User-facing family RPCs require a permanent signed user in their bodies.
alter function public.create_family_group(uuid, text, text, text)
set search_path = pg_catalog, public, app, auth, pg_temp;
alter function public.join_family_group_by_invite_code(text, text)
set search_path = pg_catalog, public, app, auth, pg_temp;
alter function public.get_family_group_members(uuid)
set search_path = pg_catalog, public, app, auth, pg_temp;

revoke all on function public.create_family_group(uuid, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.join_family_group_by_invite_code(text, text)
from public, anon, authenticated, service_role;
revoke all on function public.get_family_group_members(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.create_family_group(uuid, text, text, text) to authenticated;
grant execute on function public.join_family_group_by_invite_code(text, text) to authenticated;
grant execute on function public.get_family_group_members(uuid) to authenticated;

-- Server-only mutation and rate-limit functions stay service-role only.
alter function public.merge_anonymous_user_data(uuid, uuid)
set search_path = pg_catalog, public, auth, pg_temp;
alter function app.build_recipe_v2_snapshot(uuid)
set search_path = pg_catalog, public, app;
alter function public.capture_recipe_version(uuid, integer, text, uuid)
set search_path = pg_catalog, public, app;
alter function public.restore_recipe_version(uuid, integer, integer, text, uuid)
set search_path = pg_catalog, public, app;
alter function public.consume_api_rate_limit(text, text, integer, integer)
set search_path = pg_catalog, public;

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

grant execute on function public.merge_anonymous_user_data(uuid, uuid) to service_role;
grant execute on function app.build_recipe_v2_snapshot(uuid) to service_role;
grant execute on function public.capture_recipe_version(uuid, integer, text, uuid) to service_role;
grant execute on function public.restore_recipe_version(uuid, integer, integer, text, uuid) to service_role;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

commit;

notify pgrst, 'reload schema';
