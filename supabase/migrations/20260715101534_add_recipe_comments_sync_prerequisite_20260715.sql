do $migration_bridge$
begin
  if to_regclass('public.recipe_comments') is null then
    raise exception 'recipe_comments prerequisite is missing';
  end if;
end
$migration_bridge$;
