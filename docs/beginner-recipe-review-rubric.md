# 초보자 레시피 100점 검수표

Date: 2026-07-10

점수는 편집 우선순위를 정하는 도구다. 자동 검사나 높은 점수만으로 공개하지 않는다. 출처, 안전, 이미지 권리, 실제 조리 테스트, 검수자와 검수일이 모두 기록된 뒤에만 `approved` 후보가 된다.

## 점수표

| 영역 | 배점 | 통과 기준 |
|---|---:|---|
| 기본 구조 | 15 | 제목, 한 줄 설명, 표준 카테고리, 난이도, 인분, 준비·조리·총 시간이 실제 값으로 기록됨 |
| 재료와 계량 | 20 | 필수·선택 구분, 정확한 양·단위, 손질법, 기본 양념, 대체재와 비율, 알레르기 정보가 구조화됨 |
| 단계 실행 가능성 | 25 | 한 단계 한 행동, 불 세기, 최소·최대 시간, 눈으로 보는 완료 신호, 사용 재료 연결이 모든 단계에 있음 |
| 초보자 언어와 복구 | 15 | 모호한 표현이 없고, 실수하기 쉬운 지점과 실패 복구법을 초보자가 바로 실행할 수 있음 |
| 식품 안전과 보관 | 15 | 위험 재료 취급, 교차오염·화상 주의, 식히기, 냉장·냉동, 재가열, 폐기 기준이 메뉴에 맞게 기록됨 |
| 출처와 이미지 권리 | 10 | source ledger, 라이선스, attribution, 원문 미복제, 이미지 생성·사용 권리가 검토됨 |
| 합계 | 100 | 아래 하드 게이트도 모두 통과해야 승인 가능 |

## 하드 게이트

다음 중 하나라도 없으면 점수와 무관하게 `needs_revision`이다.

- `recipe_sources` 연결과 `legal_source` 검수 결과
- 구조화된 재료 3개 이상과 조리 단계 3개 이상
- 모든 단계의 행동, 불 세기, 시간, 눈으로 보는 완료 신호
- 초보자 검수자, 검수일, 검수 메모
- 식품 안전 검수와 메뉴별 안전 안내
- 이미지 권리 검수 또는 승인된 무이미지 상태
- 실제 사람이 수행한 조리 테스트 결과와 실패 단계 기록
- 보관 방법과 재가열 방법

`실제 조리 테스트`는 코드의 `published`, `reviewedForBeginner`, 자동 테스트 성공으로 대체할 수 없다.

## 판정

| 점수 | 편집 판정 | 공개 가능 여부 |
|---|---|---|
| 90~100 | 편집 승인 후보 | 하드 게이트와 모든 DB 증거가 있을 때만 가능 |
| 80~89 | 초보자 재검수 | 공개 불가 |
| 60~79 | 구조·문장 재작성 | 공개 불가 |
| 0~59 | 원본 재검토 또는 제외 | 공개 불가 |

## DB 검수 기록

`recipe_reviews.review_type`별로 결과를 분리한다.

- `structure`: 필드, 재료-단계 연결, 시간과 단위
- `editorial`: 한 단계 한 행동, 모호한 표현, 문체
- `beginner`: 초보자 이해, 실수 지점, 복구
- `food_safety`: 위험 재료, 보관, 재가열, 폐기
- `actual_cooking`: 실제 완성 여부, 소요 시간, 실패 단계
- `legal_source`: 출처, 라이선스, attribution, 이미지 권리

각 기록은 검수자, 점수, 결과, 메모, 증거 위치, 검수 시각을 남긴다. 한 종류의 승인으로 다른 검수 종류를 대신하지 않는다.

## 실제 조리 테스트 기록

개인정보를 최소화해 다음만 기록한다.

- 테스트 레시피 버전
- 테스트 날짜와 익명 테스터 코드
- 사용한 조리도구와 열원
- 시작·완료 시각과 실제 소요 시간
- 완성 여부
- 중단 또는 실패 단계
- 실패 이유 코드
- 안전 문제 여부
- 수정이 필요한 문장과 사진

안전 문제가 있거나 완성하지 못한 테스트는 `actual_cooking` 결과를 `needs_revision` 또는 `rejected`로 기록한다. 성공 사례만 골라 기록하지 않는다.

## 발행 필드 연결

모든 검수가 끝난 뒤 편집자가 증거를 확인하고 다음 필드를 함께 갱신한다.

- `review_status = 'approved'`
- `reviewed_for_beginner = true`와 `beginner_reviewed_at`
- `actual_cooking_tested = true`와 `actual_cooking_tested_at`
- `food_safety_reviewed = true`와 `food_safety_reviewed_at`
- `image_rights_status`와 `image_rights_reviewed_at`
- `source_reviewed_at`, `reviewer`, `published_at`

값을 채우는 작업은 service role 또는 승인된 관리자 경로에서만 수행한다. 공개 정책은 점수 자체가 아니라 위 증거 필드와 완전한 v2 콘텐츠를 검사한다.

## Phase 5 운영 패킷

- 실제 조리 시도: `docs/phase-5-actual-cooking-template.csv`
- 초보자·식품 안전·출처·이미지 권리 검수: `docs/phase-5-human-review-template.csv`
- 테스트 절차와 개인정보 최소화: `docs/phase-5-human-testing-runbook.md`
- 완료 판정: `pnpm check:phase5-human-evidence`

조리 시도는 `attempt_id`로 추가하며 이전 실패를 삭제하지 않는다. 검증기는 같은 레시피 버전의 최신 조리 시도와 4개 사람 검수가 모두 승인되고 실제 증거 경로와 DB recipe/source UUID가 확인될 때만 발행 후보로 센다.
로컬 `image_rights` 행은 독립 검수 증거이며 DB 반영 시 `recipe_reviews.review_type`으로 직접 삽입하지 않고 `recipes.image_rights_status`, `image_rights_reviewed_at`과 대응 `legal_source` 증거 참조에 연결한다.
