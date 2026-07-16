-- 검수 이력과 후기는 삭제하지 않고 신규 공개·검수 권한만 차단합니다.
revoke all on function public.moderate_recipe_comment(uuid, text, text, text, text)
from public, anon, authenticated, service_role;
revoke all on table public.recipe_comment_moderation_events from public, anon, authenticated, service_role;
revoke insert, update on table public.recipe_comments from authenticated;
comment on table public.recipe_comments is
  'Rollback quarantine: preserve reviews and disable new submissions until policy review.';
notify pgrst, 'reload schema';
