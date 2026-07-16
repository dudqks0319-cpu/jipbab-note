begin;

update public.ingredients as target
set category = backup.category
from ops_backup.ingredients_pre_canonical_category_fix_20260715 as backup
where target.id = backup.id;

revoke all on schema ops_backup from public, anon, authenticated, service_role;
revoke all on table ops_backup.ingredients_pre_canonical_category_fix_20260715
from public, anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
