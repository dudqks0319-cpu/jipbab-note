-- 레시피별 후기/메모 댓글 MVP 테이블과 RLS 정책을 추가합니다.

create table if not exists public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null,
  device_id text not null,
  user_id uuid null references auth.users(id) on delete set null,
  author_name text not null default '집밥러',
  content text not null,
  status text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_comments_content_length
    check (char_length(content) between 1 and 500),
  constraint recipe_comments_status_allowed
    check (status in ('visible', 'hidden', 'deleted'))
);

create index if not exists idx_recipe_comments_recipe_id
  on public.recipe_comments(recipe_id, created_at desc);
create index if not exists idx_recipe_comments_user_id
  on public.recipe_comments(user_id);
create index if not exists idx_recipe_comments_status
  on public.recipe_comments(status);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_recipe_comments_updated_at'
      and tgrelid = 'public.recipe_comments'::regclass
  ) then
    create trigger set_recipe_comments_updated_at
    before update on public.recipe_comments
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.recipe_comments enable row level security;

drop policy if exists recipe_comments_select_visible on public.recipe_comments;
create policy recipe_comments_select_visible
on public.recipe_comments
for select
using (status = 'visible');

drop policy if exists recipe_comments_insert_authenticated on public.recipe_comments;
create policy recipe_comments_insert_authenticated
on public.recipe_comments
for insert
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and status = 'visible'
  and char_length(content) between 1 and 500
);

drop policy if exists recipe_comments_update_own on public.recipe_comments;
create policy recipe_comments_update_own
on public.recipe_comments
for update
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and status in ('visible', 'hidden', 'deleted')
  and char_length(content) between 1 and 500
);

drop policy if exists recipe_comments_delete_own on public.recipe_comments;
create policy recipe_comments_delete_own
on public.recipe_comments
for delete
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);
