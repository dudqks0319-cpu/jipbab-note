-- 이 migration은 레시피 오류 신고의 운영 처리와 감사 이력을 추가합니다.
alter table public.recipe_issue_reports
  add column if not exists resolution_recipe_version_id uuid
    references public.recipe_versions(id) on delete set null,
  add column if not exists triaged_by text,
  add column if not exists triaged_at timestamptz;

alter table public.recipe_issue_reports
  drop constraint if exists recipe_issue_reports_triaged_by_length;
alter table public.recipe_issue_reports
  add constraint recipe_issue_reports_triaged_by_length
    check (triaged_by is null or char_length(triaged_by) between 3 and 320);

create index if not exists idx_recipe_issue_reports_resolution_version
on public.recipe_issue_reports(resolution_recipe_version_id)
where resolution_recipe_version_id is not null;

create table if not exists public.recipe_issue_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.recipe_issue_reports(id) on delete cascade,
  actor_email text not null,
  from_status text not null,
  to_status text not null,
  note text,
  recipe_version_id uuid references public.recipe_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recipe_issue_report_events_actor_length
    check (char_length(actor_email) between 3 and 320),
  constraint recipe_issue_report_events_status_allowed
    check (
      from_status in ('open', 'triaged', 'resolved', 'rejected')
      and to_status in ('open', 'triaged', 'resolved', 'rejected')
      and from_status <> to_status
    ),
  constraint recipe_issue_report_events_note_length
    check (note is null or char_length(note) <= 2000)
);

create index if not exists idx_recipe_issue_report_events_report_created
on public.recipe_issue_report_events(report_id, created_at desc);

alter table public.recipe_issue_report_events enable row level security;

revoke all on table public.recipe_issue_report_events from public, anon, authenticated;
grant all on table public.recipe_issue_report_events to service_role;

comment on table public.recipe_issue_report_events is
  'Service-role-only audit log for admin recipe issue status transitions.';
comment on column public.recipe_issue_reports.resolution_recipe_version_id is
  'Required by the admin API when an issue is resolved; must belong to the reported recipe.';

create or replace function public.transition_recipe_issue_report(
  target_report_id uuid,
  input_expected_status text,
  input_next_status text,
  input_actor_email text,
  input_resolution_note text default null,
  input_resolution_recipe_version_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_report public.recipe_issue_reports%rowtype;
  updated_report public.recipe_issue_reports%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if input_actor_email is null or char_length(input_actor_email) not between 3 and 320 then
    raise exception 'invalid_actor';
  end if;

  select * into current_report
  from public.recipe_issue_reports
  where id = target_report_id
  for update;

  if current_report.id is null then
    raise exception 'report_not_found';
  end if;
  if current_report.status <> input_expected_status then
    raise exception 'report_status_conflict';
  end if;
  if not (
    (input_expected_status = 'open' and input_next_status in ('triaged', 'rejected'))
    or (input_expected_status = 'triaged' and input_next_status in ('open', 'resolved', 'rejected'))
    or (input_expected_status in ('resolved', 'rejected') and input_next_status = 'triaged')
  ) then
    raise exception 'invalid_status_transition';
  end if;
  if input_next_status = 'resolved' and (
    input_resolution_recipe_version_id is null
    or input_resolution_note is null
    or char_length(btrim(input_resolution_note)) < 3
  ) then
    raise exception 'resolution_evidence_required';
  end if;
  if input_resolution_recipe_version_id is not null and not exists (
    select 1 from public.recipe_versions
    where id = input_resolution_recipe_version_id
      and recipe_id = current_report.recipe_id
  ) then
    raise exception 'recipe_version_mismatch';
  end if;

  update public.recipe_issue_reports
  set status = input_next_status,
      resolution_note = nullif(btrim(input_resolution_note), ''),
      resolution_recipe_version_id = input_resolution_recipe_version_id,
      triaged_by = input_actor_email,
      triaged_at = now(),
      resolved_at = case when input_next_status = 'resolved' then now() else null end
  where id = target_report_id
  returning * into updated_report;

  insert into public.recipe_issue_report_events (
    report_id,
    actor_email,
    from_status,
    to_status,
    note,
    recipe_version_id
  ) values (
    target_report_id,
    input_actor_email,
    input_expected_status,
    input_next_status,
    nullif(btrim(input_resolution_note), ''),
    input_resolution_recipe_version_id
  );

  return to_jsonb(updated_report);
end;
$$;

revoke all on function public.transition_recipe_issue_report(uuid, text, text, text, text, uuid)
from public, anon, authenticated;
grant execute on function public.transition_recipe_issue_report(uuid, text, text, text, text, uuid)
to service_role;

notify pgrst, 'reload schema';
