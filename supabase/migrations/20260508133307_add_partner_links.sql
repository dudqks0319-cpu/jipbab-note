-- 쿠팡 파트너스 링크를 앱 배포 없이 DB에서 관리하기 위한 공개 읽기 테이블입니다.

create table if not exists public.partner_links (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('item', 'category')),
  name text,
  category text,
  normalized_key text not null,
  url text not null check (url ~ '^https://link\.coupang\.com/a/[A-Za-z0-9_-]+'),
  active boolean not null default true,
  display_order integer not null default 0,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_links_target_check check (
    (kind = 'item' and name is not null and category is null)
    or (kind = 'category' and category is not null and name is null)
  ),
  constraint partner_links_key_unique unique (kind, normalized_key)
);

create index if not exists idx_partner_links_active_order
on public.partner_links(active, display_order, normalized_key);

create index if not exists idx_partner_links_active_lookup
on public.partner_links(kind, normalized_key, display_order)
where active = true;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_partner_links_updated_at'
      and tgrelid = 'public.partner_links'::regclass
  ) then
    create trigger set_partner_links_updated_at
    before update on public.partner_links
    for each row
    execute function public.set_updated_at();
  end if;
end
$$;

alter table public.partner_links enable row level security;

revoke insert, update, delete on public.partner_links from anon, authenticated;
grant select on public.partner_links to anon, authenticated;

drop policy if exists partner_links_select_active on public.partner_links;
create policy partner_links_select_active
on public.partner_links
for select
to anon, authenticated
using (active = true);

comment on table public.partner_links is
  'Public read-only Coupang Partners link catalog. Writes must be limited to service-role/admin migration paths because URL changes affect monetized outbound traffic.';

comment on policy partner_links_select_active on public.partner_links is
  'Allows anon/authenticated clients to read active links only. No anon/authenticated write policy is defined.';

insert into public.partner_links (kind, name, category, normalized_key, url, display_order, memo)
values
  ('item', '계란', null, '계란', 'https://link.coupang.com/a/eEzpQo', 10, '검색결과 공유 파트너스 링크'),
  ('item', '두부', null, '두부', 'https://link.coupang.com/a/eEzG5O', 20, '검색결과 공유 파트너스 링크'),
  ('item', '대파', null, '대파', 'https://link.coupang.com/a/eEzKyg', 30, '검색결과 공유 파트너스 링크'),
  ('item', '김치', null, '김치', 'https://link.coupang.com/a/eEAbrW', 40, '검색결과 공유 파트너스 링크'),
  ('item', '양파', null, '양파', 'https://link.coupang.com/a/eEAj6u', 50, '검색결과 공유 파트너스 링크'),
  ('item', '감자', null, '감자', 'https://link.coupang.com/a/eEAmko', 60, '검색결과 공유 파트너스 링크'),
  ('item', '당근', null, '당근', 'https://link.coupang.com/a/eEAsMV', 70, '검색결과 공유 파트너스 링크'),
  ('item', '애호박', null, '애호박', 'https://link.coupang.com/a/eEAxFO', 80, '검색결과 공유 파트너스 링크'),
  ('item', '오이', null, '오이', 'https://link.coupang.com/a/eEBm2L', 90, '검색결과 공유 파트너스 링크'),
  ('item', '콩나물', null, '콩나물', 'https://link.coupang.com/a/eEBwvx', 100, '검색결과 공유 파트너스 링크'),
  ('item', '시금치', null, '시금치', 'https://link.coupang.com/a/eEBHWc', 110, '검색결과 공유 파트너스 링크'),
  ('item', '양배추', null, '양배추', 'https://link.coupang.com/a/eEBQ5h', 120, '검색결과 공유 파트너스 링크'),
  ('item', '돼지고기', null, '돼지고기', 'https://link.coupang.com/a/eEB0hw', 130, '검색결과 공유 파트너스 링크'),
  ('item', '소고기', null, '소고기', 'https://link.coupang.com/a/eEB7av', 140, '검색결과 공유 파트너스 링크'),
  ('item', '닭고기', null, '닭고기', 'https://link.coupang.com/a/eECtUS', 150, '검색결과 공유 파트너스 링크'),
  ('item', '참치캔', null, '참치캔', 'https://link.coupang.com/a/eECxYR', 160, '검색결과 공유 파트너스 링크'),
  ('item', '냉동만두', null, '냉동만두', 'https://link.coupang.com/a/eECBGn', 170, '검색결과 공유 파트너스 링크'),
  ('item', '냉동새우', null, '냉동새우', 'https://link.coupang.com/a/eECFNR', 180, '검색결과 공유 파트너스 링크'),
  ('item', '간장', null, '간장', 'https://link.coupang.com/a/eECLFB', 190, '검색결과 공유 파트너스 링크'),
  ('item', '고추장', null, '고추장', 'https://link.coupang.com/a/eEC0rn', 200, '검색결과 공유 파트너스 링크'),
  ('item', '된장', null, '된장', 'https://link.coupang.com/a/eEC4B7', 210, '검색결과 공유 파트너스 링크'),
  ('item', '쌈장', null, '쌈장', 'https://link.coupang.com/a/eEC8R4', 220, '검색결과 공유 파트너스 링크'),
  ('item', '참기름', null, '참기름', 'https://link.coupang.com/a/eEEWDc', 230, '검색결과 공유 파트너스 링크'),
  ('item', '들기름', null, '들기름', 'https://link.coupang.com/a/eEE3h0', 240, '검색결과 공유 파트너스 링크'),
  ('item', '고춧가루', null, '고춧가루', 'https://link.coupang.com/a/eEFaZX', 250, '검색결과 공유 파트너스 링크'),
  ('item', '카레가루', null, '카레가루', 'https://link.coupang.com/a/eEFdhI', 260, '검색결과 공유 파트너스 링크'),
  ('item', '국수', null, '국수', 'https://link.coupang.com/a/eEFgnJ', 270, '검색결과 공유 파트너스 링크'),
  ('item', '라면', null, '라면', 'https://link.coupang.com/a/eEFjGY', 280, '검색결과 공유 파트너스 링크'),
  ('item', '떡국떡', null, '떡국떡', 'https://link.coupang.com/a/eEFua6', 290, '검색결과 공유 파트너스 링크'),
  ('item', '어묵', null, '어묵', 'https://link.coupang.com/a/eEFU05', 300, '검색결과 공유 파트너스 링크'),
  ('item', '사과', null, '사과', 'https://link.coupang.com/a/eEGU0F', 310, '검색결과 공유 파트너스 링크'),
  ('item', '생수', null, '생수', 'https://link.coupang.com/a/eEGYWK', 320, '검색결과 공유 파트너스 링크'),
  ('category', null, '유제품', '유제품', 'https://link.coupang.com/a/eEzpQo', 1010, '계란/유제품 fallback'),
  ('category', null, '채소', '채소', 'https://link.coupang.com/a/eEzKyg', 1020, '채소 fallback'),
  ('category', null, '육류', '육류', 'https://link.coupang.com/a/eEB0hw', 1030, '육류 fallback'),
  ('category', null, '냉동식품', '냉동식품', 'https://link.coupang.com/a/eECBGn', 1040, '냉동식품 fallback'),
  ('category', null, '수산물', '수산물', 'https://link.coupang.com/a/eECFNR', 1050, '수산물 fallback'),
  ('category', null, '조미료', '조미료', 'https://link.coupang.com/a/eECLFB', 1060, '조미료 fallback'),
  ('category', null, '곡물/면/빵', '곡물/면/빵', 'https://link.coupang.com/a/eEFgnJ', 1070, '곡물/면/빵 fallback'),
  ('category', null, '통조림/가공식품', '통조림/가공식품', 'https://link.coupang.com/a/eECxYR', 1080, '통조림/가공식품 fallback'),
  ('category', null, '과일', '과일', 'https://link.coupang.com/a/eEGU0F', 1090, '과일 fallback'),
  ('category', null, '음료/기타', '음료/기타', 'https://link.coupang.com/a/eEGYWK', 1100, '음료/기타 fallback')
on conflict (kind, normalized_key) do update
set
  name = excluded.name,
  category = excluded.category,
  url = excluded.url,
  active = true,
  display_order = excluded.display_order,
  memo = excluded.memo;
