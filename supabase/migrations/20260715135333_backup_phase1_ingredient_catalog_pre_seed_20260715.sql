create schema if not exists ops_backup;

create table if not exists ops_backup.ingredients_catalog_pre_phase1_seed_20260715
(like public.ingredients_catalog including all);

insert into ops_backup.ingredients_catalog_pre_phase1_seed_20260715
select * from public.ingredients_catalog
on conflict (id) do nothing;

create table if not exists ops_backup.ingredient_aliases_pre_phase1_seed_20260715
(like public.ingredient_aliases including all);

insert into ops_backup.ingredient_aliases_pre_phase1_seed_20260715
select * from public.ingredient_aliases
on conflict (id) do nothing;

revoke all on table ops_backup.ingredients_catalog_pre_phase1_seed_20260715
from public, anon, authenticated;

revoke all on table ops_backup.ingredient_aliases_pre_phase1_seed_20260715
from public, anon, authenticated;

comment on table ops_backup.ingredients_catalog_pre_phase1_seed_20260715 is
'Pre-seed snapshot captured before the Phase 1 ingredient catalog seed on 2026-07-15.';

comment on table ops_backup.ingredient_aliases_pre_phase1_seed_20260715 is
'Pre-seed snapshot captured before the Phase 1 ingredient alias seed on 2026-07-15.';
