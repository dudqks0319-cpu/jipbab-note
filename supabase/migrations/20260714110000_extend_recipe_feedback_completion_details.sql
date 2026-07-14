alter table public.recipe_feedback
  add column if not exists difficult_step_order smallint,
  add column if not exists taste_result text,
  add column if not exists repeat_intent text;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_feedback_difficult_step_valid'
      and conrelid = 'public.recipe_feedback'::regclass
  ) then
    alter table public.recipe_feedback
      add constraint recipe_feedback_difficult_step_valid
      check (difficult_step_order is null or difficult_step_order between 1 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_feedback_difficult_step_consistent'
      and conrelid = 'public.recipe_feedback'::regclass
  ) then
    alter table public.recipe_feedback
      add constraint recipe_feedback_difficult_step_consistent
      check (
        difficult_step_order is null
        or completion_status = 'completed_with_difficulty'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_feedback_taste_result_allowed'
      and conrelid = 'public.recipe_feedback'::regclass
  ) then
    alter table public.recipe_feedback
      add constraint recipe_feedback_taste_result_allowed
      check (taste_result is null or taste_result in ('delicious', 'acceptable', 'poor'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_feedback_repeat_intent_allowed'
      and conrelid = 'public.recipe_feedback'::regclass
  ) then
    alter table public.recipe_feedback
      add constraint recipe_feedback_repeat_intent_allowed
      check (repeat_intent is null or repeat_intent in ('yes', 'after_adjustment', 'no'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_feedback_completion_details_consistent'
      and conrelid = 'public.recipe_feedback'::regclass
  ) then
    alter table public.recipe_feedback
      add constraint recipe_feedback_completion_details_consistent
      check (
        completion_status <> 'failed'
        or (
          difficult_step_order is null
          and taste_result is null
          and repeat_intent is null
        )
      );
  end if;
end
$migration$;

alter table public.recipe_feedback enable row level security;
revoke all on table public.recipe_feedback from public, anon, authenticated;
grant select, insert on table public.recipe_feedback to service_role;

comment on column public.recipe_feedback.difficult_step_order is
  'Optional bounded step selected only for a completed-with-difficulty result.';
comment on column public.recipe_feedback.taste_result is
  'Optional fixed-choice taste result. Free text and personal details are not collected.';
comment on column public.recipe_feedback.repeat_intent is
  'Optional fixed-choice intent to cook the recipe again.';

notify pgrst, 'reload schema';
