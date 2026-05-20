# 쿠팡 파트너스 재료별 링크 입력표

집밥노트는 Supabase `partner_links` 테이블에 입력된 재료별 링크를 장보기 화면에서 우선 사용한다. 아래 표의 `파트너스 링크` 칸을 쿠팡 파트너스에서 발급한 실제 링크로 채운 뒤 DB에 `upsert`한다.

## 입력 규칙

- 쿠팡 파트너스에서 직접 발급한 단축 링크 또는 딥링크만 넣는다.
- 경쟁 앱, 블로그, 쇼핑몰 제휴 링크를 복사하지 않는다.
- 앱에는 광고/제휴 링크 고지가 필요하다. 스토어 심사 메모와 앱 설명에도 반영한다.
- 실제 계정별 수익 링크는 운영 DB에서 관리하고, 이 문서는 관리용 체크리스트로만 사용한다.
- 재료별 링크가 없으면 DB 카테고리 대표 링크, 환경변수 fallback, 일반 쿠팡 검색 링크 순서로 fallback된다.
- DB 조회가 실패해도 사용자 화면에는 오류를 띄우지 않고, 앱에 포함된 검증된 fallback 링크와 환경변수 링크를 계속 사용한다.
- `partner_links` 쓰기는 운영자/service-role 경로로만 처리하고, 클라이언트 `anon`/`authenticated` 권한에는 공개 읽기만 허용한다.

## 우선 입력 재료

| 재료명 | 카테고리 | 파트너스 링크 |
| --- | --- | --- |
| 계란 | 유제품 | https://link.coupang.com/a/eEzpQo |
| 두부 | 유제품 | https://link.coupang.com/a/eEzG5O |
| 대파 | 채소 | https://link.coupang.com/a/eEzKyg |
| 김치 | 통조림/가공식품 | https://link.coupang.com/a/eEAbrW |
| 양파 | 채소 | https://link.coupang.com/a/eEAj6u |
| 감자 | 채소 | https://link.coupang.com/a/eEAmko |
| 당근 | 채소 | https://link.coupang.com/a/eEAsMV |
| 애호박 | 채소 | https://link.coupang.com/a/eEAxFO |
| 오이 | 채소 | https://link.coupang.com/a/eEBm2L |
| 콩나물 | 채소 | https://link.coupang.com/a/eEBwvx |
| 시금치 | 채소 | https://link.coupang.com/a/eEBHWc |
| 양배추 | 채소 | https://link.coupang.com/a/eEBQ5h |
| 돼지고기 | 육류 | https://link.coupang.com/a/eEB0hw |
| 소고기 | 육류 | https://link.coupang.com/a/eEB7av |
| 닭고기 | 육류 | https://link.coupang.com/a/eECtUS |
| 참치캔 | 통조림/가공식품 | https://link.coupang.com/a/eECxYR |
| 냉동만두 | 냉동식품 | https://link.coupang.com/a/eECBGn |
| 냉동새우 | 냉동식품 | https://link.coupang.com/a/eECFNR |
| 간장 | 조미료 | https://link.coupang.com/a/eECLFB |
| 고추장 | 조미료 | https://link.coupang.com/a/eEC0rn |
| 된장 | 조미료 | https://link.coupang.com/a/eEC4B7 |
| 쌈장 | 조미료 | https://link.coupang.com/a/eEC8R4 |
| 참기름 | 조미료 | https://link.coupang.com/a/eEEWDc |
| 들기름 | 조미료 | https://link.coupang.com/a/eEE3h0 |
| 고춧가루 | 조미료 | https://link.coupang.com/a/eEFaZX |
| 카레가루 | 조미료 | https://link.coupang.com/a/eEFdhI |
| 국수 | 곡물/면/빵 | https://link.coupang.com/a/eEFgnJ |
| 라면 | 곡물/면/빵 | https://link.coupang.com/a/eEFjGY |
| 떡국떡 | 곡물/면/빵 | https://link.coupang.com/a/eEFua6 |
| 어묵 | 수산물 | https://link.coupang.com/a/eEFU05 |
| 사과 | 과일 | https://link.coupang.com/a/eEGU0F |
| 생수 | 음료/기타 | https://link.coupang.com/a/eEGYWK |

## DB upsert 예시

```sql
insert into public.partner_links (kind, name, normalized_key, url, display_order, memo)
values
  ('item', '계란', '계란', 'https://link.coupang.com/a/your-egg-link', 10, '검색결과 공유 파트너스 링크')
on conflict (kind, normalized_key) do update
set url = excluded.url, active = true, display_order = excluded.display_order, memo = excluded.memo;
```
