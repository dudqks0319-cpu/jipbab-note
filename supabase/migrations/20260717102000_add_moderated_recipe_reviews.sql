-- 이 migration은 기존 레시피 댓글을 구조화된 사전 검수 후기로 강화합니다.
alter table public.recipe_comments
  add column if not exists outcome text,
  add column if not exists taste text,
  add column if not exists remake_intent text,
  add column if not exists actual_duration_minutes integer,
  add column if not exists substitution_notes text,
  add column if not exists family_reaction text,
  add column if not exists moderated_by text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_note text;

alter table public.recipe_comments drop constraint if exists recipe_comments_status_allowed;
alter table public.recipe_comments add constraint recipe_comments_status_allowed
  check (status in ('pending', 'visible', 'hidden', 'rejected', 'deleted'));
alter table public.recipe_comments drop constraint if exists recipe_comments_review_fields_valid;
alter table public.recipe_comments add constraint recipe_comments_review_fields_valid
  check (
    (outcome is null or outcome in ('success', 'partial', 'failed'))
    and (taste is null or taste in ('not_rated', 'bland', 'balanced', 'salty'))
    and (remake_intent is null or remake_intent in ('yes', 'maybe', 'no'))
    and (actual_duration_minutes is null or actual_duration_minutes between 1 and 1440)
    and (substitution_notes is null or char_length(substitution_notes) <= 300)
    and (family_reaction is null or char_length(family_reaction) <= 300)
    and (moderated_by is null or char_length(moderated_by) between 3 and 320)
    and (moderation_note is null or char_length(moderation_note) <= 1000)
  );

drop policy if exists recipe_comments_insert_authenticated on public.recipe_comments;
create policy recipe_comments_insert_authenticated
on public.recipe_comments
for insert
to authenticated
with check (
  app.is_permanent_user()
  and user_id = (select auth.uid())
  and status = 'pending'
  and outcome is not null
  and taste is not null
  and remake_intent is not null
  and actual_duration_minutes is not null
  and char_length(content) between 3 and 500
);

drop policy if exists recipe_comments_update_own on public.recipe_comments;
create policy recipe_comments_update_own
on public.recipe_comments
for update
to authenticated
using (app.is_permanent_user() and user_id = (select auth.uid()))
with check (
  app.is_permanent_user()
  and user_id = (select auth.uid())
  and status = 'deleted'
  and content = '삭제된 댓글입니다.'
);

create table if not exists public.recipe_comment_moderation_events (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.recipe_comments(id) on delete cascade,
  actor_email text not null,
  from_status text not null,
  to_status text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint recipe_comment_moderation_events_status_allowed
    check (
      from_status in ('pending', 'visible', 'hidden', 'rejected', 'deleted')
      and to_status in ('pending', 'visible', 'hidden', 'rejected')
      and from_status <> to_status
    ),
  constraint recipe_comment_moderation_events_lengths
    check (char_length(actor_email) between 3 and 320 and (note is null or char_length(note) <= 1000))
);

alter table public.recipe_comment_moderation_events enable row level security;
revoke all on table public.recipe_comment_moderation_events from public, anon, authenticated;
grant all on table public.recipe_comment_moderation_events to service_role;

create or replace function public.moderate_recipe_comment(
  target_comment_id uuid,
  input_expected_status text,
  input_next_status text,
  input_actor_email text,
  input_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_comment public.recipe_comments%rowtype;
  updated_comment public.recipe_comments%rowtype;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if input_next_status not in ('visible', 'hidden', 'rejected') then
    raise exception 'invalid_moderation_status';
  end if;
  if input_next_status in ('hidden', 'rejected') and char_length(btrim(coalesce(input_note, ''))) < 3 then
    raise exception 'moderation_note_required';
  end if;

  select * into current_comment
  from public.recipe_comments
  where id = target_comment_id
  for update;
  if current_comment.id is null then raise exception 'comment_not_found'; end if;
  if current_comment.status <> input_expected_status then raise exception 'comment_status_conflict'; end if;
  if current_comment.status = 'deleted' then raise exception 'deleted_comment_immutable'; end if;

  update public.recipe_comments
  set status = input_next_status,
      moderated_by = input_actor_email,
      moderated_at = now(),
      moderation_note = nullif(btrim(input_note), '')
  where id = target_comment_id
  returning * into updated_comment;

  insert into public.recipe_comment_moderation_events (
    comment_id, actor_email, from_status, to_status, note
  ) values (
    target_comment_id,
    input_actor_email,
    input_expected_status,
    input_next_status,
    nullif(btrim(input_note), '')
  );

  return to_jsonb(updated_comment);
end;
$$;

revoke all on function public.moderate_recipe_comment(uuid, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.moderate_recipe_comment(uuid, text, text, text, text)
to service_role;

comment on table public.recipe_comments is
  'Structured text-only cooking reviews. New submissions remain pending until explicit admin moderation.';
comment on table public.recipe_comment_moderation_events is
  'Service-role-only audit log for recipe review moderation.';

notify pgrst, 'reload schema';
