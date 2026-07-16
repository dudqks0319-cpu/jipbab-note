begin;

create or replace function public.consume_api_rate_limit(
  input_route_key text,
  input_key_hash text,
  request_limit integer,
  window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request_time timestamptz := clock_timestamp();
  bucket_start timestamptz;
  bucket_end timestamptz;
  current_count integer;
  retry_after integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if input_route_key is null or input_route_key !~ '^[a-z0-9:_-]{1,80}$' then
    raise exception 'invalid_route_key';
  end if;
  if input_key_hash is null or input_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_key_hash';
  end if;
  if request_limit < 1 or request_limit > 10000 then
    raise exception 'invalid_request_limit';
  end if;
  if window_seconds < 1 or window_seconds > 3600 then
    raise exception 'invalid_window_seconds';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from request_time) / window_seconds) * window_seconds
  );
  bucket_end := bucket_start + make_interval(secs => window_seconds);

  delete from public.api_rate_limit_buckets
  where expires_at < request_time;

  insert into public.api_rate_limit_buckets (
    route_key,
    key_hash,
    window_start,
    request_count,
    expires_at
  ) values (
    input_route_key,
    input_key_hash,
    bucket_start,
    1,
    bucket_end + make_interval(secs => window_seconds)
  )
  on conflict (route_key, key_hash, window_start)
  do update
  set request_count = public.api_rate_limit_buckets.request_count + 1,
      expires_at = excluded.expires_at,
      updated_at = request_time
  returning request_count into current_count;

  retry_after := greatest(1, ceil(extract(epoch from bucket_end - request_time))::integer);

  return jsonb_build_object(
    'allowed', current_count <= request_limit,
    'remaining', greatest(request_limit - current_count, 0),
    'retryAfter', retry_after,
    'limit', request_limit,
    'windowSeconds', window_seconds
  );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
from public, anon, authenticated, service_role;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
to service_role;

comment on function public.consume_api_rate_limit(text, text, integer, integer) is
  'Rollback restored the prior one-hour maximum without deleting pseudonymous counters.';

commit;

notify pgrst, 'reload schema';
