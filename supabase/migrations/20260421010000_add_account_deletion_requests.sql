-- 앱 내 계정 삭제 요청 시작점을 기록하기 위한 테이블입니다.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  reason text,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_account_deletion_requests_user_id
on public.account_deletion_requests(user_id);

create index if not exists idx_account_deletion_requests_status
on public.account_deletion_requests(status);

create unique index if not exists account_deletion_requests_open_unique
on public.account_deletion_requests(user_id)
where status = 'requested';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_account_deletion_requests_updated_at'
      and tgrelid = 'public.account_deletion_requests'::regclass
  ) then
    create trigger set_account_deletion_requests_updated_at
    before update on public.account_deletion_requests
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own
on public.account_deletion_requests
for select
using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists account_deletion_requests_insert_own on public.account_deletion_requests;
create policy account_deletion_requests_insert_own
on public.account_deletion_requests
for insert
with check (auth.uid() is not null and user_id = auth.uid());
