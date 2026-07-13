# Phase 6 제품·레시피 품질 대시보드

Updated: 2026-07-13 KST

## 현재 판정

- ANL-002 제품 대시보드: 로컬 비식별 JSON/HTML 생성기 구현
- ANL-003 레시피 품질 대시보드: 로컬 비식별 JSON/HTML 생성기 구현
- 제품 분석 전송은 계속 기본 비활성
- 외부 분석 벤더·보관기간·삭제·opt-out: 미승인
- 실제 사용자 field 데이터: 미수집
- 현재 화면 증거: 합성 QA fixture 기반이며 라이브 지표가 아님

이 산출물은 개인정보를 제외한 이벤트 계약과 집계 공식을 검증하기 위한 로컬 보고서다. 외부 네트워크로 이벤트를 보내지 않으며, 앱의 분석 수집을 켜지 않는다.

## 제품 지표 공식

신규 사용자 코호트는 입력 범위 안에서 `onboarding_viewed`를 가진 고유 `anonymous_session_id`다. 같은 세션에서 아래 순서가 실제로 지켜진 경우만 다음 단계로 센다.

`온보딩 → 재료 등록 → 추천 확인 → 상세 → 조리 시작 → 조리 완료`

- 첫 재료 등록률: 순서상 `ingredient_added`까지 도달한 코호트 / 신규 사용자
- 첫 추천 확인률: 순서상 `recommendation_result_viewed`까지 도달한 코호트 / 신규 사용자
- 레시피 상세 진입률: 순서상 `recipe_viewed`까지 도달한 코호트 / 신규 사용자
- 조리 시작률: 순서상 `cooking_started`까지 도달한 코호트 / 신규 사용자
- 조리 완료율: 순서상 `cooking_completed`까지 도달한 코호트 / 신규 사용자
- 7일 재방문: 첫 온보딩 시각부터 정확히 7일째 24시간 안에 이벤트가 있는 코호트 / 신규 사용자

입력 범위 이전 활동을 알 수 없으므로 이 코호트는 라이브 신규 사용자 수를 대신하지 않는다. 실제 운영 대시보드는 전체 보관기간과 코호트 timezone이 승인된 뒤 같은 공식을 적용한다.

## 레시피 품질 공식

`cooking_started`마다 같은 가명 세션·recipe ID·version의 조리 시도를 연다. 이후 완료, 중단 또는 실패 이벤트 하나가 해당 시도를 닫는다.

- 시작·완료·중단·실패 수와 각 시작 대비 비율
- 중단 직전 마지막 `step_number`
- `cooking_completed.elapsed_seconds`의 중앙값과 p95
- `recipe_viewed` 고유 세션 대비 `missing_ingredients_added` 고유 세션 비율
- allowlist `failure_code`별 실패 수

재검수 순위는 숨은 합산 점수를 만들지 않는다. `안전 우려 건수 → 실패율 → 중단율 → 시작 수`의 내림차순과 recipe ID의 안정적 tie-break를 사용한다. 시작 5회 미만은 `표본 부족`으로 표시한다. 이 순위와 합성 fixture는 편집 후보를 고르는 보조 자료이며 실제 조리·안전·출처·이미지 권리 또는 발행 승인 근거가 아니다.

## 운영 지표

`api.request_completed` 구조화 로그에서 정규화한 endpoint별 요청 수, 4xx·5xx 비율, p50·p95 latency, error code와 deployment SHA만 집계한다. 외부 API 실패, DB 오류, 이미지 오류와 클라이언트 오류는 현재 별도 계측이 없으므로 0으로 보이지 않고 `instrumentation_gaps`에 남긴다.

## 개인정보·입력 경계

- 입력은 최대 10MiB, 100,000 JSONL records다.
- product event와 operational event 모두 unknown property를 거부한다.
- timestamp는 canonical ISO 문자열이어야 한다.
- email, phone, token, raw URL, query, body와 자유 입력은 이벤트 계약에서 거부한다.
- 보고서에는 `anonymous_session_id`를 출력하지 않는다.
- 오류는 원문 record를 출력하지 않고 입력 종류와 line number, 안정적 error code만 표시한다.
- HTML은 외부 script, font, image 또는 network request를 사용하지 않는다.

## 실행

```bash
pnpm check:phase6-analytics-dashboard
pnpm capture:phase6-analytics-dashboard -- \
  --product-input tests/fixtures/phase-6-product-events.jsonl \
  --operational-input tests/fixtures/phase-6-operational-events.jsonl \
  --generated-at 2026-07-13T10:00:00.000Z
```

기본 출력:

- `output/phase6-analytics/phase6-analytics-dashboard.json`
- `output/phase6-analytics/phase6-analytics-dashboard.html`

`output/`은 git에서 제외한다. fixture는 합성 QA fixture이며 사용자·운영 데이터가 아니다.

## 표시 계약

- 첫 화면에 데이터 상태, 마지막 이벤트 시각, 신규·활성 사용자, 조리 완료율과 D7 재방문을 표시한다.
- 핵심 값과 막대 값은 hover 없이 읽을 수 있다.
- 390px 모바일에서는 KPI를 2열로, funnel을 1열로 재배치한다.
- 표는 열을 축소해 읽기 어렵게 만들지 않고 수평 스크롤 영역으로 유지한다.
- 데이터 없음, 부분 데이터, 검토 가능을 분리한다.
- missing coverage, instrumentation gap과 합성 데이터 caveat를 항상 표시한다.

## 남은 외부 게이트

- Owner `Product+Privacy`, due `before_product_analytics_enablement`: 사용자 동의, 보관기간, 삭제·opt-out과 개인정보 처리방침 승인
- Owner `FullStackDev+SRE`, due `before_live_dashboard_signoff`: 승인된 transport·warehouse·dashboard와 접근권한 연결
- Owner `FullStackDev+QA`, due `before_phase6_completion`: staging 실제 이벤트 수신, schema rejection, D7 timezone, alert 전달과 rollback drill 증거
