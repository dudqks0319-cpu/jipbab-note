# Phase 6 브라우저 E2E·데모 네트워크 보고서

Updated: 2026-07-11 KST

## 결론

현재 운영 계약에서 자동화할 수 있는 게스트 첫 사용, 재료 저장·복원, publication fail-closed, 인증·입력 음성 경로를 fresh Chrome profile에서 검증했다. 총 12개 runtime check가 통과했고 데모 홈과 목록의 `/api/v1/*` 요청은 각각 0건이다.

이 결과는 계획서의 전체 E2E 완료를 뜻하지 않는다. 공개 승인된 staging 레시피가 0개이므로 추천 성공, 상세, 장보기 추가, 조리 모드, 타이머, 완료 happy path는 실행할 수 없다. 자동 점수나 데모 fixture에 가짜 사람 검수 증거를 붙여 이 차단을 우회하지 않았다.

## 변경 전 상태와 원인

- 브라우저 E2E 실행기와 release gate 계약이 없었다.
- `useDemoMode()`는 query string을 effect에서 판별하지만 초기값은 `false`뿐이었다. 데이터 훅은 “일반 모드”와 “아직 판별 전”을 구분하지 못해 `?demo=appstore` 첫 렌더에서 recipe API를 한 번 호출했다.
- Vercel Preview에서 그 요청은 예상된 503이었고 브라우저 console에 실패 resource로 남았다.
- 최초 E2E assertion은 Playwright 접근성 트리의 합성 이름 `냉장고 2개`를 `body.innerText`의 연속 문자열로 잘못 기대했다. 실제 DOM은 `보관 2개`, `냉장 재료 2개`로 저장 성공 상태를 표시했다.
- 레시피 검색 input의 Playwright 접근성 이름은 placeholder에서 왔지만 최초 CDP selector는 존재하지 않는 aria-label을 가정했다.

## 변경 파일

- `hooks/useDemoMode.ts`: `isDemoMode`와 `ready`를 분리한 `useDemoModeState()` 추가
- `app/page.tsx`, `app/recipe/page.tsx`: demo query 판별 전과 demo mode에서 API v1 fetch 차단
- `scripts/capture-phase-6-e2e-negative.mjs`: fresh Chrome profile 기반 390px runtime E2E
- `scripts/check-phase-6-e2e-contract.mjs`: 8개 정적 계약
- `tests/phase-6-e2e-contract.test.ts`: package·release gate wiring 회귀 테스트
- `scripts/run-release-gates.mjs`, `scripts/run-ci-release-gates.mjs`: Phase 6 E2E 계약 연결
- 기존 source-shape 테스트와 beginner readiness checker는 새 fetch-readiness 계약을 검증하도록 갱신

새 dependency, DB migration, API response shape 변경은 없다.

## 계획서 E2E 시나리오 상태

| # | 시나리오 | 현재 증거 | 상태 |
| ---: | --- | --- | --- |
| 1 | 게스트 첫 사용 | fresh profile에서 starter 화면 확인 | 검증됨 |
| 2 | 재료 등록 | 계란·두부 저장, reload 후 `보관 2개` 복원 | 검증됨 |
| 3 | 추천 확인 | 미검수 0개 상태에서 publication 안내 | 음성 경로만 검증 |
| 4 | 레시피 검색 | `q=계란` URL·input 복원과 503 안내 | 음성 경로만 검증 |
| 5 | 상세 진입 | non-UUID/unapproved 상세 fail-closed | 음성 경로만 검증 |
| 6 | 장보기 추가 | 공개 승인 recipe fixture 없음 | 차단 |
| 7 | 조리 시작 | 공개 승인 detail fixture 없음 | 차단 |
| 8 | 타이머 | unit·Phase 4 하네스는 통과, 이번 E2E에서는 미실행 | 차단 |
| 9 | 조리 완료 | 공개 승인 detail fixture 없음 | 차단 |
| 10 | 로그인·데이터 이전 | 위조 device와 invalid merge token 401 | 음성 경로만 검증 |
| 11 | 오프라인 복구 | 실기기·서비스 워커 기준 미검증 | 차단 |
| 12 | 계정 삭제 | 잘못된 확인 문구 400/no-store | 음성 경로만 검증 |

## Runtime 결과

`pnpm capture:phase6-e2e-negative`:

- `fresh_guest_starter_visible`
- `guest_ingredients_saved`
- `recommendation_fail_closed`
- `guest_ingredients_restored_after_reload`
- `recipe_search_url_restored`
- `recipe_list_fail_closed`
- `recipe_detail_fail_closed`
- `demo_home_no_recipe_api`
- `demo_list_no_recipe_api`
- `family_auth_rejected`
- `merge_auth_rejected`
- `account_delete_input_rejected`

Screenshot: `output/ui-evidence/phase6-e2e-guest-negative-390.png` (로컬 ignored evidence).

## 검증

- E2E static contract: 8/8
- E2E negative runtime: 12/12
- `pnpm test`: lint 0 errors, 기존 unused import warning 1건, TypeScript pass, unit 370/370
- `pnpm test:integration`: 미검수 공개 0건과 signed-session 음성 경로 pass
- `pnpm build`: Next.js 16.2.6 compile, TypeScript, 38/38 routes pass
- `pnpm release:ci-static-check`: 14/14
- `pnpm release:check`: 13 pass, Phase 5 사람 증거 0/20 한 항목만 expected fail
- implementation commit: `1c91aa814ffc80182b73d390c768e574aaf25c51`

## 남은 위험과 다음 증거

- 공개 승인된 recipe v2 staging fixture를 만든 뒤 추천 → 상세 → 장보기 → 조리 → 타이머 → 완료 happy path를 같은 자동화에서 실행해야 한다.
- 로그인 성공·anonymous merge 성공·authenticated account deletion은 격리된 staging 계정과 정리 절차가 필요하다.
- 오프라인 복구와 iOS/Android background 동작은 실제 기기 증거가 필요하다.
- Phase 5 실제 조리·초보자·식품 안전·출처·이미지 권리 검수는 각각 0/20이다.
- migration history와 backup/rollback rehearsal이 끝나지 않아 Supabase production에는 적용하지 않았다.
