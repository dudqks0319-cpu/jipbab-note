begin;

create schema if not exists ops_backup;
revoke all on schema ops_backup from public, anon, authenticated;

create table if not exists ops_backup.family_groups_pre_signed_session_20260715
as table public.family_groups;
create table if not exists ops_backup.family_members_pre_signed_session_20260715
as table public.family_members;
create table if not exists ops_backup.ingredients_pre_signed_session_20260715
as table public.ingredients;
create table if not exists ops_backup.shopping_items_pre_signed_session_20260715
as table public.shopping_items;
create table if not exists ops_backup.favorites_pre_signed_session_20260715
as table public.favorites;
create table if not exists ops_backup.community_posts_pre_signed_session_20260715
as table public.community_posts;
create table if not exists ops_backup.community_comments_pre_signed_session_20260715
as table public.community_comments;
create table if not exists ops_backup.community_likes_pre_signed_session_20260715
as table public.community_likes;
create table if not exists ops_backup.account_deletion_requests_pre_signed_session_20260715
as table public.account_deletion_requests;
create table if not exists ops_backup.account_deletion_events_pre_signed_session_20260715
as table public.account_deletion_request_events;

create table if not exists ops_backup.policies_pre_signed_session_20260715 as
select *
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in (
    'family_groups', 'family_members', 'ingredients', 'shopping_items',
    'favorites', 'community_posts', 'community_comments', 'community_likes',
    'account_deletion_requests', 'account_deletion_request_events', 'objects'
  );

create table if not exists ops_backup.function_defs_pre_signed_session_20260715 as
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (
  ('app', 'current_device_id'),
  ('app', 'request_header'),
  ('public', 'create_family_group'),
  ('public', 'family_group_member_count'),
  ('public', 'get_family_group_members'),
  ('public', 'is_current_family_group_owner'),
  ('public', 'is_current_family_member'),
  ('public', 'join_family_group_by_invite_code'),
  ('public', 'merge_anonymous_user_data')
);

create table if not exists ops_backup.schema_migrations_pre_signed_session_20260715 as
select *
from supabase_migrations.schema_migrations;

create table if not exists ops_backup.backup_manifest_pre_signed_session_20260715 as
select
  now() as captured_at,
  current_database() as database_name,
  jsonb_build_object(
    'family_groups', (select count(*) from public.family_groups),
    'family_members', (select count(*) from public.family_members),
    'ingredients', (select count(*) from public.ingredients),
    'shopping_items', (select count(*) from public.shopping_items),
    'favorites', (select count(*) from public.favorites),
    'community_posts', (select count(*) from public.community_posts),
    'community_comments', (select count(*) from public.community_comments),
    'community_likes', (select count(*) from public.community_likes),
    'account_deletion_requests', (select count(*) from public.account_deletion_requests),
    'account_deletion_request_events', (select count(*) from public.account_deletion_request_events)
  ) as row_counts;

revoke all on all tables in schema ops_backup from public, anon, authenticated;

comment on table ops_backup.backup_manifest_pre_signed_session_20260715 is
  'Migration-scoped backup before signed-session RLS migration. Not a full project disaster-recovery backup.';

commit;

