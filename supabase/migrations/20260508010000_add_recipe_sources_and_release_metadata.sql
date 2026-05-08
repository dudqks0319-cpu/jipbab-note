-- 레시피 원천/라이선스 추적과 계정 삭제 상태값을 출시 기준으로 고정합니다.

create table if not exists public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text,
  title text not null,
  source_url text,
  license text not null,
  attribution text not null,
  raw_payload jsonb,
  imported_at timestamptz not null default now(),
  unique (provider, external_id)
);

alter table public.recipes
  add column if not exists source_id uuid references public.recipe_sources(id),
  add column if not exists content_origin text,
  add column if not exists reviewed_for_beginner boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_content_origin_allowed'
      and conrelid = 'public.recipes'::regclass
  ) then
    alter table public.recipes
      add constraint recipes_content_origin_allowed
      check (content_origin is null or content_origin in ('original', 'public_api', 'licensed', 'user_bookmark'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'account_deletion_requests_status_allowed'
      and conrelid = 'public.account_deletion_requests'::regclass
  ) then
    alter table public.account_deletion_requests
      add constraint account_deletion_requests_status_allowed
      check (status in ('requested', 'reviewing', 'completed', 'rejected'));
  end if;
end
$$;

update public.recipes
set content_origin = case
  when source like 'mfds:%' then 'public_api'
  when source is null or source = '' then 'original'
  else 'licensed'
end
where content_origin is null;

create index if not exists idx_recipe_sources_provider_external_id
on public.recipe_sources(provider, external_id);

create index if not exists idx_recipes_source_id
on public.recipes(source_id);

create index if not exists idx_recipes_content_origin
on public.recipes(content_origin);

alter table public.recipe_sources enable row level security;

drop policy if exists recipe_sources_select_public on public.recipe_sources;
create policy recipe_sources_select_public
on public.recipe_sources
for select
using (true);

drop policy if exists recipe_sources_insert_service_role on public.recipe_sources;
create policy recipe_sources_insert_service_role
on public.recipe_sources
for insert
to service_role
with check (true);

drop policy if exists recipe_sources_update_service_role on public.recipe_sources;
create policy recipe_sources_update_service_role
on public.recipe_sources
for update
to service_role
using (true)
with check (true);

drop policy if exists recipe_sources_delete_service_role on public.recipe_sources;
create policy recipe_sources_delete_service_role
on public.recipe_sources
for delete
to service_role
using (true);

comment on table public.recipe_sources is
  'Release source ledger for public API, original, licensed, and user-bookmark recipe data. Do not copy protected blog/video text or images into recipes.';

comment on column public.recipes.reviewed_for_beginner is
  'True only when quantities, beginner tips, and cooking steps were reviewed for novice home-cooking use.';
