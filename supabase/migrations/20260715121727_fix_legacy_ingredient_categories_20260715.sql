begin;

create schema if not exists ops_backup;
revoke all on schema ops_backup from public, anon, authenticated, service_role;

create table if not exists ops_backup.ingredients_pre_category_fix_20260715 as
select id, name, category, updated_at
from public.ingredients
where category = '유제품'
  and regexp_replace(lower(trim(name)), '[[:space:]]+', '', 'g') in ('계란', '달걀', '두부');

revoke all on table ops_backup.ingredients_pre_category_fix_20260715
from public, anon, authenticated, service_role;

update public.ingredients
set category = case
  when regexp_replace(lower(trim(name)), '[[:space:]]+', '', 'g') in ('계란', '달걀') then '육류'
  when regexp_replace(lower(trim(name)), '[[:space:]]+', '', 'g') = '두부' then '통조림/가공식품'
  else category
end
where category = '유제품'
  and regexp_replace(lower(trim(name)), '[[:space:]]+', '', 'g') in ('계란', '달걀', '두부');

commit;

notify pgrst, 'reload schema';
