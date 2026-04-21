-- 계정 삭제 요청 상태 변경 이력을 기록합니다.

create table if not exists public.account_deletion_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.account_deletion_requests(id) on delete cascade,
  actor_email text,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_deletion_request_events_request_id
on public.account_deletion_request_events(request_id);

alter table public.account_deletion_request_events enable row level security;

drop policy if exists account_deletion_request_events_select_own on public.account_deletion_request_events;
create policy account_deletion_request_events_select_own
on public.account_deletion_request_events
for select
using (
  exists (
    select 1
    from public.account_deletion_requests r
    where r.id = account_deletion_request_events.request_id
      and auth.uid() is not null
      and r.user_id = auth.uid()
  )
);
