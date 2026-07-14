create table if not exists public.recipe_feedback (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  recipe_version integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_submission_id uuid not null,
  completion_status text not null,
  difficulty_feedback text not null,
  failed_step_order smallint,
  reason_code text,
  actual_duration_seconds integer,
  comment text,
  created_at timestamptz not null default now(),
  constraint recipe_feedback_recipe_version_positive
    check (recipe_version between 1 and 1000000),
  constraint recipe_feedback_completion_status_allowed
    check (completion_status in (
      'completed_independently',
      'completed_with_difficulty',
      'failed'
    )),
  constraint recipe_feedback_difficulty_allowed
    check (difficulty_feedback in ('manageable', 'difficult', 'blocked')),
  constraint recipe_feedback_status_difficulty_consistent
    check (
      (completion_status = 'completed_independently' and difficulty_feedback = 'manageable')
      or (completion_status = 'completed_with_difficulty' and difficulty_feedback = 'difficult')
      or (completion_status = 'failed' and difficulty_feedback = 'blocked')
    ),
  constraint recipe_feedback_failed_step_valid
    check (failed_step_order is null or failed_step_order between 1 and 100),
  constraint recipe_feedback_reason_allowed
    check (reason_code is null or reason_code in (
      'unclear_instructions',
      'not_enough_time',
      'heat_control',
      'ingredient_quantity',
      'missing_tool',
      'timer_issue',
      'burned_or_undercooked',
      'other'
    )),
  constraint recipe_feedback_failure_fields_consistent
    check (
      (completion_status = 'failed' and failed_step_order is not null)
      or (
        completion_status <> 'failed'
        and failed_step_order is null
        and reason_code is null
      )
    ),
  constraint recipe_feedback_duration_valid
    check (actual_duration_seconds is null or actual_duration_seconds between 1 and 43200),
  constraint recipe_feedback_no_free_text
    check (comment is null),
  unique (user_id, client_submission_id)
);

create index if not exists idx_recipe_feedback_recipe_created
on public.recipe_feedback(recipe_id, created_at desc);

create index if not exists idx_recipe_feedback_user_created
on public.recipe_feedback(user_id, created_at desc);

alter table public.recipe_feedback enable row level security;
revoke all on table public.recipe_feedback from public, anon, authenticated;
grant select, insert on table public.recipe_feedback to service_role;

comment on table public.recipe_feedback is
  'Private completion and failed-step evidence. App roles cannot access rows directly.';

comment on column public.recipe_feedback.comment is
  'Reserved for a separately reviewed consent flow; constrained to null in this release.';

notify pgrst, 'reload schema';
