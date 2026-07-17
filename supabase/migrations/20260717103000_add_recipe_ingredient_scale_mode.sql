-- 이 migration은 인분 환산 시 재료별 배수 적용 방식을 명시합니다.
alter table public.recipe_ingredients
  add column if not exists scale_mode text not null default 'linear';

alter table public.recipe_ingredients
  drop constraint if exists recipe_ingredients_scale_mode_allowed;
alter table public.recipe_ingredients
  add constraint recipe_ingredients_scale_mode_allowed
    check (scale_mode in ('linear', 'fixed', 'to_taste'));

-- 양념은 무조건 배수로 늘리지 않고 검수 계량을 유지한 뒤 마지막 간을 보도록 합니다.
update public.recipe_ingredients
set scale_mode = 'to_taste'
where group_type = 'seasoning' and scale_mode = 'linear';

comment on column public.recipe_ingredients.scale_mode is
  'linear scales by servings, fixed keeps the reviewed amount, and to_taste keeps the amount with a taste-adjustment label.';

notify pgrst, 'reload schema';
