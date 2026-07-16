do $migration_bridge$
begin
  if to_regprocedure('public.handle_user_deletion()') is null
    or not exists (
      select 1
      from pg_trigger
      where tgname = 'on_auth_user_deleted'
        and tgrelid = 'auth.users'::regclass
        and not tgisinternal
    ) then
    raise exception 'user-deletion prerequisite is missing';
  end if;
end
$migration_bridge$;
