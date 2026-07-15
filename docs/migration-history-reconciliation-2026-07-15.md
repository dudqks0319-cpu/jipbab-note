# 운영 DB 마이그레이션 이력·Phase 1 카탈로그 대조

Updated: 2026-07-15 KST  
Project ref: `xqelabiwtjntwrjqcteo`

## 결론

- 운영 DB의 Phase 1 스키마는 이미 존재했지만 `ingredients_catalog`와 `ingredient_aliases`는 각각 0건이었다.
- 앱의 권위 소스는 계란을 `육류`, 두부를 `통조림/가공식품`으로 분류하지만 기존 생성 산출물은 두 항목을 `유제품`으로 되돌리고 있었다.
- 생성기·SQL·CSV·정적 추천 카탈로그를 같은 분류로 정렬하고 출시 계약에 회귀 검사를 추가했다.
- 운영 적용 전 비공개 `ops_backup` 스냅샷을 만들고, 정정된 멱등 시드를 적용했다.
- 적용 후 운영 카탈로그는 173개, 정확 별칭은 258개, 중복 별칭은 0개다.
- 과거 로컬 버전 6건은 원격 이력에 같은 버전으로 기록되지 않았지만 실제 기능 객체는 후속 대체 마이그레이션으로 존재한다. 이 버전 표시는 공식 `supabase migration repair` 절차로 별도 정리해야 하며 직접 이력 테이블을 수정하지 않는다.

## 운영 적용 기록

| 원격 버전 | 이름 | 결과 |
|---|---|---|
| `20260715135333` | `backup_phase1_ingredient_catalog_pre_seed_20260715` | `ops_backup`에 카탈로그·별칭 사전 스냅샷 생성, 앱 역할 권한 없음 |
| `20260715135424` | `seed_phase1_ingredient_catalog_reconciled_20260715` | 정정된 카탈로그 173개·별칭 258개 upsert |

적용 전 원본 테이블은 모두 0건이어서 두 백업 테이블도 0건이다. 빈 백업이라는 사실 자체가 적용 전 상태의 증거이며, 스냅샷 테이블은 삭제하지 않는다.

## 적용 후 운영 검증

| 검사 | 결과 |
|---|---:|
| `ingredients_catalog` | 173 |
| `ingredient_aliases` | 258 |
| 중복 `(locale, normalized_alias)` | 0 |
| `dairy-egg` | `계란 | 육류` |
| `dairy-tofu` | `두부 | 통조림/가공식품` |
| `달걀` 별칭 | `dairy-egg | synonym` |
| anon catalog SELECT | false |
| authenticated catalog SELECT | false |
| anon alias SELECT | false |
| authenticated alias SELECT | false |

Supabase advisor의 `RLS enabled, no policy` 정보 알림은 이 두 내부 테이블에 의도된 상태다. RLS를 켜고 앱 역할의 테이블 권한을 철회해 공개 클라이언트가 직접 읽지 못하게 하며, 서버의 검증된 API 경로만 사용한다.

## 과거 로컬 버전과 운영 객체 대응

| 로컬 버전 | 운영에서 확인한 대응 상태 |
|---|---|
| `20260521160347_add_family_group_rpc` | 가족 생성·참여·구성원 조회 RPC가 존재하고 authenticated 실행 계약이 확인됨 |
| `20260523090000_add_recipe_comments` | `public.recipe_comments`가 존재하며 `20260715101534`가 전제 조건을 기록함 |
| `20260526093000_harden_community_image_storage` | `community-images` 버킷과 소유 경로 정책 3개가 존재함 |
| `20260527093000_add_family_scoped_fridge_shopping` | `ingredients.family_group_id`, `shopping_items.family_group_id`가 존재함 |
| `20260528010000_fix_family_member_rls_recursion` | 비재귀 가족 구성원 helper가 존재하고 이전 legacy helper는 제거됨 |
| `20260530000000_cascade_user_deletion` | 사용자 삭제 handler가 존재하며 `20260715101658`가 전제 조건을 기록함 |
| `20260710140000_replace_device_guest_auth_with_signed_sessions` | `20260715101553`으로 운영 적용 기록됨 |
| `20260711113000_harden_security_definer_privileges` | `20260715101716`으로 운영 적용 기록됨 |
| `20260710151000_seed_phase1_ingredient_catalog` | `20260715135424`으로 정정된 동일 시드가 운영 적용됨 |

## 남은 이력 정리 절차

1. 현재 원격 migration list와 이 문서의 의미상 대응표를 다시 대조한다.
2. 각 로컬 누락 버전의 SQL과 운영 객체가 완전히 동등한지 함수 정의·정책·컬럼 단위로 재확인한다.
3. 동등성이 확인된 버전만 Supabase CLI의 공식 `migration repair --status applied`로 기록한다.
4. `supabase migration list --linked`에서 로컬·원격 버전이 일치하는지 확인한다.
5. `supabase db push --dry-run --linked`가 새 DDL을 제안하지 않는지 확인한다.
6. 직접 `supabase_migrations.schema_migrations`를 수정하지 않는다.

CLI 사용 기준은 [Supabase CLI migration list](https://supabase.com/docs/reference/cli/supabase-migration-list)와 [Supabase CLI migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair)를 따른다.

## 현재 출시 판단

- 익명 냉장고·장보기 동기화: 운영 브라우저에서 완료 상태와 재로딩 보존 확인 완료.
- Phase 1 카탈로그 데이터: 운영 적용 및 검증 완료.
- 공개 승인 레시피: 0개. 자체 작성 20개는 미리보기만 허용하고 조리·장보기 연결은 잠금 유지.
- 사람 실제 조리·초보자·식품안전·법무·이미지 권리 검수: 0/20으로 출시 차단 유지.
- 전체 `db push`: 과거 6개 버전의 공식 이력 repair 전까지 금지.
