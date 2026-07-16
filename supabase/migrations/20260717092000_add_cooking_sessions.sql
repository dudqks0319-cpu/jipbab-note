-- 이 migration은 로그인 사용자가 명시적으로 저장한 비공개 조리 완료 세션을 추가합니다.
create table if not exists public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  client_session_id uuid not null,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  actual_duration_minutes integer not null,
  outcome text not null,
  difficulty text not null,
  taste text not null default 'not_rated',
  remake_intent text not null,
  substitute_notes text,
  family_reaction text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cooking_sessions_user_client_unique unique (user_id, client_session_id),
  constraint cooking_sessions_time_order check (completed_at >= started_at),
  constraint cooking_sessions_duration_range check (actual_duration_minutes between 1 and 1440),
  constraint cooking_sessions_outcome_allowed check (outcome in ('success', 'partial', 'failed')),
  constraint cooking_sessions_difficulty_allowed check (difficulty in ('easy', 'okay', 'hard')),
  constraint cooking_sessions_taste_allowed check (taste in ('not_rated', 'bland', 'balanced', 'salty')),
  constraint cooking_sessions_remake_allowed check (remake_intent in ('yes', 'maybe', 'no')),
  constraint cooking_sessions_text_lengths check (
    (substitute_notes is null or char_length(substitute_notes) <= 300)
    and (family_reaction is null or char_length(family_reaction) <= 300)
    and (comment is null or char_length(comment) <= 500)
  )
);

create index if not exists idx_cooking_sessions_recipe_completed
on public.cooking_sessions(recipe_id, completed_at desc);
create index if not exists idx_cooking_sessions_user_completed
on public.cooking_sessions(user_id, completed_at desc);

drop trigger if exists set_cooking_sessions_updated_at on public.cooking_sessions;
create trigger set_cooking_sessions_updated_at
  before update on public.cooking_sessions
  for each row execute function public.set_updated_at();

alter table public.cooking_sessions enable row level security;

drop policy if exists cooking_sessions_insert_own on public.cooking_sessions;
create policy cooking_sessions_insert_own
on public.cooking_sessions
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists cooking_sessions_select_own on public.cooking_sessions;
create policy cooking_sessions_select_own
on public.cooking_sessions
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.cooking_sessions from anon;
revoke all on table public.cooking_sessions from authenticated;
grant select, insert on table public.cooking_sessions to authenticated;
grant all on table public.cooking_sessions to service_role;

comment on table public.cooking_sessions is
  'Private user cooking outcomes. Rows are saved only after explicit user action and are not editorial recipe approval evidence.';

notify pgrst, 'reload schema';
