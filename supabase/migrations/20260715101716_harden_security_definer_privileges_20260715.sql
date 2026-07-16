do $migration_bridge$
begin
  if to_regprocedure('public.is_current_family_member(uuid)') is null
    or to_regprocedure('public.is_current_family_group_owner(uuid)') is null
    or to_regprocedure('public.family_group_member_count(uuid)') is not null
    or has_function_privilege('anon', 'public.is_current_family_member(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.is_current_family_member(uuid)', 'EXECUTE') then
    raise exception 'SECURITY DEFINER hardening prerequisite is missing';
  end if;
end
$migration_bridge$;
