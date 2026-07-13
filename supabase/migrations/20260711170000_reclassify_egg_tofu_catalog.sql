-- 이 migration은 ingredient catalog의 계란과 두부를 유제품에서 정확한 사용자 분류로 이동합니다.
update public.ingredients_catalog
set category = case id
  when 'dairy-egg' then '계란·난류'
  when 'dairy-tofu' then '콩·두부'
  else category
end,
updated_at = now()
where id in ('dairy-egg', 'dairy-tofu');

insert into public.partner_links (kind, name, category, normalized_key, url, display_order, memo)
values
  ('category', null, '계란·난류', '계란·난류', 'https://link.coupang.com/a/eEzpQo', 1001, 'Phase 6 정확한 계란 분류 fallback'),
  ('category', null, '콩·두부', '콩·두부', 'https://link.coupang.com/a/eEzG5O', 1002, 'Phase 6 정확한 두부 분류 fallback')
on conflict (kind, normalized_key) do nothing;

notify pgrst, 'reload schema';
