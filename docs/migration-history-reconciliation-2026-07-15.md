# 운영 DB 마이그레이션 이력·Phase 1 카탈로그 대조

Updated: 2026-07-15 KST  
Project ref: `xqelabiwtjntwrjqcteo`

## 결론

- 운영 DB의 Phase 1 스키마는 이미 존재했지만 `ingredients_catalog`와 `ingredient_aliases`는 각각 0건이었다.
- 앱의 권위 소스는 계란을 `육류`, 두부를 `통조림/가공식품`으로 분류하지만 기존 생성 산출물은 두 항목을 `유제품`으로 되돌리고 있었다.
- 생성기·SQL·CSV·정적 추천 카탈로그를 같은 분류로 정렬하고 출시 계약에 회귀 검사를 추가했다.
- 운영 적용 전 비공개 `ops_backup` 스냅샷을 만들고, 정정된 멱등 시드를 적용했다.
- 적용 후 운영 카탈로그는 173개, 정확 별칭은 258개, 중복 별칭은 0개다.
- 운영 스키마와 대응 마이그레이션을 함수·정책·컬럼 단위로 대조한 뒤, 의미상 적용 완료된 로컬 버전 9건을 공식 `supabase migration repair --status applied`로 기록했다. 이력 테이블은 직접 수정하지 않았고 스키마·사용자 데이터 DDL도 재실행하지 않았다.
- 운영에서 별도 타임스탬프로 기록된 prerequisite·signed-session·삭제 cascade·SECURITY DEFINER 4건은 로컬에도 같은 버전의 검증 bridge를 추가해 새 환경과 운영 이력의 버전 집합을 맞췄다.

## 운영 적용 기록

| 원격 버전 | 이름 | 결과 |
|---|---|---|
| `20260715135333` | `backup_phase1_ingredient_catalog_pre_seed_20260715` | `ops_backup`에 카탈로그·별칭 사전 스냅샷 생성, 앱 역할 권한 없음 |
| `20260715135424` | `seed_phase1_ingredient_catalog_reconciled_20260715` | 정정된 카탈로그 173개·별칭 258개 upsert |
| history repair | 의미상 적용 완료된 로컬 버전 9건 | 공식 CLI로 `applied` 기록, 스키마·사용자 데이터 변경 없음 |

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

## 완료된 이력 정리 절차

1. 원격 migration statements와 로컬 SQL을 대조해 운영 전용 버전 4건의 대응 관계를 확인했다.
2. 함수 정의·권한·정책·컬럼·인덱스·트리거·카탈로그 개수로 로컬 누락 버전 9건의 의미상 적용 상태를 확인했다.
3. `supabase migration repair ... --status applied --linked --yes`로 9건의 이력만 기록했다.
4. `supabase migration list --linked`에서 로컬·원격 40개 버전이 모두 일치함을 확인했다.
5. `supabase db push --dry-run --linked`에서 `Remote database is up to date.`를 확인했다.
6. 직접 `supabase_migrations.schema_migrations`를 수정하지 않았고, 실제 `db push`도 실행하지 않았다.

공식 repair로 기록한 버전은 `20260521160347`, `20260523090000`, `20260526093000`, `20260527093000`, `20260528010000`, `20260530000000`, `20260710140000`, `20260710151000`, `20260711113000`이다.

CLI 사용 기준은 [Supabase CLI migration list](https://supabase.com/docs/reference/cli/supabase-migration-list)와 [Supabase CLI migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair)를 따른다.

## 현재 출시 판단

- 익명 냉장고·장보기 동기화: 운영 브라우저에서 완료 상태와 재로딩 보존 확인 완료.
- Phase 1 카탈로그 데이터: 운영 적용 및 검증 완료.
- 공개 승인 레시피: 0개. 자체 작성 20개는 미리보기만 허용하고 조리·장보기 연결은 잠금 유지.
- 사람 실제 조리·초보자·식품안전·법무·이미지 권리 검수: 0/20으로 출시 차단 유지.
- 전체 `db push` 이력 차단: 해소. dry-run 기준 추가 적용 대상 없음.
- 실제 운영 `db push`: 이번 작업에서는 실행하지 않았으며, 향후 새 migration을 배포할 때 다시 백업·dry-run·검증을 거친다.
