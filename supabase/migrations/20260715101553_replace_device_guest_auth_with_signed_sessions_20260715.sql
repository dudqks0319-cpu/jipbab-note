do $migration_bridge$
begin
  if to_regprocedure('app.current_device_id()') is null
    or to_regprocedure('app.is_permanent_user()') is null
    or to_regprocedure('public.merge_anonymous_user_data(uuid,uuid)') is null then
    raise exception 'signed-session prerequisite is missing';
  end if;
end
$migration_bridge$;
