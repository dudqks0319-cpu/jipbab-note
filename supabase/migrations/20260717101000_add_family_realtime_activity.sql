-- 이 migration은 가족 구성원 활동 이력, 안전한 탈퇴, 실시간 갱신 신호를 추가합니다.
create table if not exists public.family_activity_events (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_display_name text not null,
  event_type text not null,
  created_at timestamptz not null default now(),
  constraint family_activity_events_actor_length
    check (char_length(actor_display_name) between 1 and 24),
  constraint family_activity_events_type_allowed
    check (event_type in ('group_created', 'member_joined', 'member_updated', 'member_left'))
);

create index if not exists idx_family_activity_events_group_created
on public.family_activity_events(family_group_id, created_at desc);

alter table public.family_activity_events enable row level security;

drop policy if exists family_activity_events_select_member on public.family_activity_events;
create policy family_activity_events_select_member
on public.family_activity_events
for select
to authenticated
using (public.is_current_family_member(family_group_id));

revoke all on table public.family_activity_events from public, anon, authenticated;
grant select on table public.family_activity_events to authenticated;
grant all on table public.family_activity_events to service_role;

create or replace function public.record_family_member_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.family_activity_events (
      family_group_id, actor_user_id, actor_display_name, event_type
    ) values (
      new.family_group_id,
      new.user_id,
      new.display_name,
      case when new.role = 'owner' then 'group_created' else 'member_joined' end
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.display_name is distinct from old.display_name then
    insert into public.family_activity_events (
      family_group_id, actor_user_id, actor_display_name, event_type
    ) values (
      new.family_group_id, new.user_id, new.display_name, 'member_updated'
    );
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.family_activity_events (
      family_group_id, actor_user_id, actor_display_name, event_type
    ) values (
      old.family_group_id, old.user_id, old.display_name, 'member_left'
    );
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists record_family_member_activity on public.family_members;
create trigger record_family_member_activity
  after insert or update of display_name or delete on public.family_members
  for each row execute function public.record_family_member_activity();

create or replace function public.leave_family_group(group_id_input uuid)
returns text
language plpgsql
security definer
set search_path = public, app, auth, pg_temp
as $$
declare
  acting_user_id uuid := (select auth.uid());
  current_member public.family_members%rowtype;
  member_count integer;
begin
  if not app.is_permanent_user() then
    raise exception 'permanent_user_required';
  end if;

  select * into current_member
  from public.family_members
  where family_group_id = group_id_input
    and user_id = acting_user_id
  for update;
  if current_member.id is null then
    raise exception 'family_group_access_denied';
  end if;

  select count(*)::integer into member_count
  from public.family_members
  where family_group_id = group_id_input;

  if current_member.role = 'owner' then
    if member_count > 1 then
      raise exception 'ownership_transfer_required';
    end if;
    delete from public.family_groups where id = group_id_input;
    return 'group_deleted';
  end if;

  delete from public.family_members where id = current_member.id;
  return 'member_left';
end;
$$;

revoke all on function public.record_family_member_activity() from public, anon, authenticated;
revoke all on function public.leave_family_group(uuid) from public, anon;
grant execute on function public.leave_family_group(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.family_activity_events;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication is unavailable; realtime remains disabled until staging setup';
end $$;

alter table public.ingredients replica identity full;
alter table public.shopping_items replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.ingredients;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication is unavailable for ingredients';
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shopping_items;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication is unavailable for shopping_items';
end $$;

comment on table public.family_activity_events is
  'Member-visible bounded family membership activity used with RLS-scoped inventory realtime refresh signals.';
comment on function public.leave_family_group(uuid) is
  'Members may leave; an owner must remain while other members exist and can delete only a one-member group.';

notify pgrst, 'reload schema';
