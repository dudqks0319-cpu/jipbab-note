-- 재료 구매/보관/소진 메타데이터를 선택적으로 저장합니다.
alter table public.ingredients
  add column if not exists purchase_date date,
  add column if not exists opened_at timestamptz,
  add column if not exists storage_location text,
  add column if not exists unit_price numeric(12, 2),
  add column if not exists purchase_place text,
  add column if not exists consumed_at timestamptz,
  add column if not exists discarded_at timestamptz,
  add column if not exists repeat_purchase boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ingredients_unit_price_nonnegative'
      and conrelid = 'public.ingredients'::regclass
  ) then
    alter table public.ingredients
      add constraint ingredients_unit_price_nonnegative
      check (unit_price is null or unit_price >= 0);
  end if;
end $$;
