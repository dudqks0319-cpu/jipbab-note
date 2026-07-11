revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
from public, anon, authenticated, service_role;
drop function if exists public.consume_api_rate_limit(text, text, integer, integer);

revoke all on table public.api_rate_limit_buckets from public, anon, authenticated;
comment on table public.api_rate_limit_buckets is
  'Rollback retained pseudonymous counters for expiry-based cleanup; no app role can read or mutate them.';

notify pgrst, 'reload schema';
