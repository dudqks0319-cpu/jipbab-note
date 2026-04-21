-- 계정 삭제 후에도 운영 처리 이력은 최소 감사 추적으로 보존합니다.

alter table public.account_deletion_requests
alter column user_id drop not null;

alter table public.account_deletion_requests
drop constraint if exists account_deletion_requests_user_id_fkey;

alter table public.account_deletion_requests
add constraint account_deletion_requests_user_id_fkey
foreign key (user_id) references auth.users(id) on delete set null;
