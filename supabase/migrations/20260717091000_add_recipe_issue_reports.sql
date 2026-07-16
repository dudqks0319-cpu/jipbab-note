-- 이 migration은 로그인 사용자의 비공개 레시피 오류 신고 큐를 추가합니다.
create table if not exists public.recipe_issue_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_type text not null,
  details text not null,
  status text not null default 'open',
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_issue_reports_type_allowed
    check (issue_type in ('ingredient_amount', 'instruction', 'time_servings', 'allergen', 'food_safety', 'image', 'source_rights', 'other')),
  constraint recipe_issue_reports_details_length
    check (char_length(btrim(details)) between 3 and 500),
  constraint recipe_issue_reports_status_allowed
    check (status in ('open', 'triaged', 'resolved', 'rejected')),
  constraint recipe_issue_reports_resolution_length
    check (resolution_note is null or char_length(resolution_note) <= 2000)
);

create index if not exists idx_recipe_issue_reports_recipe_status
on public.recipe_issue_reports(recipe_id, status, created_at desc);
create index if not exists idx_recipe_issue_reports_user_created
on public.recipe_issue_reports(user_id, created_at desc);

drop trigger if exists set_recipe_issue_reports_updated_at on public.recipe_issue_reports;
create trigger set_recipe_issue_reports_updated_at
  before update on public.recipe_issue_reports
  for each row execute function public.set_updated_at();

alter table public.recipe_issue_reports enable row level security;

drop policy if exists recipe_issue_reports_insert_own on public.recipe_issue_reports;
create policy recipe_issue_reports_insert_own
on public.recipe_issue_reports
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'open'
);

drop policy if exists recipe_issue_reports_select_own on public.recipe_issue_reports;
create policy recipe_issue_reports_select_own
on public.recipe_issue_reports
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.recipe_issue_reports from anon;
revoke all on table public.recipe_issue_reports from authenticated;
grant select, insert on table public.recipe_issue_reports to authenticated;
grant all on table public.recipe_issue_reports to service_role;

comment on table public.recipe_issue_reports is
  'Private recipe quality and safety reports. Public comments must not be used as the moderation queue.';

notify pgrst, 'reload schema';
