-- 재료 입력값이 과도하게 커지거나 허용되지 않은 보관값으로 저장되는 것을 막습니다.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingredients_name_length'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_name_length
      check (char_length(name) between 1 and 120)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingredients_storage_type_allowed'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_storage_type_allowed
      check (storage_type in ('냉장', '냉동', '실온'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingredients_text_field_lengths'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_text_field_lengths
      check (
        (category is null or char_length(category) <= 40)
        and (quantity is null or char_length(quantity) <= 80)
        and (barcode is null or char_length(barcode) <= 80)
        and (image_url is null or char_length(image_url) <= 2048)
        and (memo is null or char_length(memo) <= 500)
        and (storage_location is null or char_length(storage_location) <= 80)
        and (purchase_place is null or char_length(purchase_place) <= 120)
      )
      not valid;
  end if;
end $$;
