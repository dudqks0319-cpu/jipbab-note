-- 이 rollback은 계란과 두부의 catalog 분류를 이전 유제품 값으로 되돌립니다.
update public.ingredients_catalog
set category = '유제품',
    updated_at = now()
where id in ('dairy-egg', 'dairy-tofu');

delete from public.partner_links
where kind = 'category'
  and normalized_key in ('계란·난류', '콩·두부')
  and memo in ('Phase 6 정확한 계란 분류 fallback', 'Phase 6 정확한 두부 분류 fallback');

notify pgrst, 'reload schema';
