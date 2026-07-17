-- 운영 rollback은 증거 컬럼을 삭제하지 않고 자동 환산을 보수적으로 중단합니다.
update public.recipe_ingredients
set scale_mode = 'fixed'
where scale_mode = 'linear';

comment on column public.recipe_ingredients.scale_mode is
  'Rollback state: automatic linear serving scaling disabled without deleting reviewed values.';

notify pgrst, 'reload schema';
