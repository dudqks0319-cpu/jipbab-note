-- auth.users 레코드 삭제 시 public 스키마 내 해당 사용자의 데이터와 계정삭제 요청 PII를
-- 원자적(Atomic)으로 정리하는 trigger 및 함수를 생성합니다.

create or replace function public.handle_user_deletion()
returns trigger
security definer
set search_path = public, auth
language plpgsql
as $$
begin
  update public.account_deletion_requests
  set
    user_id = null,
    email = null,
    reason = null,
    updated_at = now()
  where user_id = old.id;

  delete from public.ingredients where user_id = old.id;
  delete from public.favorites where user_id = old.id;
  delete from public.shopping_items where user_id = old.id;
  delete from public.community_likes where user_id = old.id;
  delete from public.recipe_comments where user_id = old.id;
  delete from public.community_comments where user_id = old.id;
  delete from public.community_posts where user_id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute function public.handle_user_deletion();
