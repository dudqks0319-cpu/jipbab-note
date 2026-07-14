# Phase 7 비공개 베타 실행서

Updated: 2026-07-14 KST

이 문서는 계획서의 Phase 7을 실제 사용자 5~20명으로 한 번 반복하기 위한 실행 계약이다. 자동 테스트, 시뮬레이터, 운영 대시보드 수치는 실제 베타 사용자 증거를 대신하지 않는다.

## 시작 전 게이트

다음 항목이 확인되기 전에는 참여자를 모집하거나 공개 베타를 승인하지 않는다.

1. `pnpm check:phase5-human-evidence`로 핵심 20개 실제 조리·초보자·식품 안전·출처·이미지 권리 검수 완료
2. 테스트에 쓸 Git SHA, 앱 빌드, 레시피 버전 고정
3. iOS·Android 또는 웹 중 실제 테스트 표면의 설치·접속 확인
4. 개인정보 처리방침, 지원 경로, 계정 삭제 경로 확인
5. 오류 대응 담당자와 중단 기준 공유
6. `20260714100000_add_recipe_feedback.sql`, `20260714110000_extend_recipe_feedback_completion_details.sql` staging 순차 적용과 `POST /api/v1/recipe-feedback` 인증·권한·음수 경로 확인

외부 콘솔, Android 실기기 또는 모니터링 채널이 준비되지 않은 동안에는 템플릿·검증기·운영 절차만 준비하고 실제 수치를 만들지 않는다.

## 제품 내 최소 피드백 경로

- 조리 화면은 완성 여부, 실패/어려움 단계, 8개 선택형 실패 이유, 선택형 맛 결과·다시 만들 의향, 최대 12시간의 실제 조리시간만 수집한다.
- 완료 화면의 재료 소진은 실제로 사용한 항목을 참여자가 확인한 뒤 실행하고, 잘못 처리한 경우 냉장고 소진 기록에서 되돌린다.
- 이름·이메일·전화번호·자유서술은 받지 않고 서명된 Supabase 세션의 사용자 ID만 서버에서 검증한다.
- 서버가 준비되지 않으면 기기에 저장됐다고만 표시하며 전송 완료로 주장하지 않는다.
- 앱 수집 행은 실패 단계 집계를 돕지만 참여 동의, 실제 음식 사진, 관찰 기록, 안전 검수와 공개 베타 승인을 대신하지 않는다.
- 구현·보안·미적용 migration 상태는 `docs/phase-7-recipe-feedback-collection.md`에서 관리한다.

## 개인정보와 동의

- 참여자는 이름·이메일·전화번호 대신 `tester-a01` 같은 익명 코드만 사용한다.
- 연락처와 모집 명단은 이 저장소와 `output/`에 저장하지 않는다.
- 세션마다 `consent_status=confirmed`를 기록한다.
- 사진·영상에는 얼굴, 주소, 알림, 계정 정보, 기기 식별자가 보이지 않게 한다.
- `docs/phase-7-private-beta-sessions.csv`의 이메일·전화번호 형태 값과 증거 경로 탈출은 검증기가 차단한다.

## 참여자와 세션

- 고유 참여자: 5~20명
- 각 참여자는 최소 한 번의 `product_flow`와 한 번의 `representative_recipe` 세션을 수행한다.
- `product_flow`: 냉장고 등록 → 추천 확인 → 상세 → 조리 시작 → 완료까지 측정한다.
- `representative_recipe`: 앱 안내만 보고 대표 레시피를 조리하고 외부 도움 없이 성공했는지 기록한다.
- 성공뿐 아니라 중단, 오류, 이해하지 못한 단계와 안전 문제를 같은 우선순위로 기록한다.

## 증거 폴더

원본 증거는 Git에서 제외된 다음 경로에 둔다.

```text
output/phase7-private-beta-evidence/
  <tester_code>/
    <session_id>/
      notes.md
      screen-recording.mov
      completed-dish.jpg
```

CSV의 `evidence_path`는 위 경로 아래에 실제로 존재해야 한다. 원본을 외부에 공유하기 전 개인정보와 기기 식별자를 다시 확인한다.

## 기록 계약

`docs/phase-7-private-beta-sessions.csv`에 세션당 한 행을 추가한다.

- `session_id`, `tester_code`: 익명 코드
- `app_build_sha`, `app_build`, `recipe_id`, `recipe_version`: 실제 테스트 후보 고정 값
- `outcome`: `completed`, `abandoned`, `error`
- `beginner_success`: 외부 도움 없이 대표 조리를 성공했을 때만 `true`
- `confusing_step_count`: 이해하지 못한 단계 수
- `failed_step`, `failure_code`: 중단·오류 시 필수
- `error_code`: 오류 세션에서 필수이며 원시 오류 메시지나 토큰은 기록하지 않는다.
- `safety_issue`: `none` 또는 `reported`; 보고되면 즉시 베타 중단
- `issue_severity`, `issue_status`: `none|p0|p1|p2|p3`, `none|open|fixed`
- `resolution_ref`: 수정 커밋·이슈·검증 패킷의 익명 추적 코드
- `copy_change_id`, `recommendation_change_id`: 변경 없음은 `none`

같은 `recipe_id:failed_step`에서 중단·오류가 두 번 이상 나오면 반복 중단 단계로 간주한다. 해당 행은 모두 `issue_status=fixed`이고 `resolution_ref`가 있어야 공개 베타 승인 후보가 된다.

## 목표와 중단 규칙

| 지표 | 완료 기준 |
|---|---:|
| 조리 시작 대비 완료율 | 60% 이상 |
| 대표 레시피 초보자 조리 성공률 | 80% 이상 |
| 한 세션당 이해하지 못한 단계 평균 | 1개 미만 |
| 안전 문제 | 0건 |
| 미해결 P0/P1 | 0건 |
| 반복 중단 단계 | 모두 수정 |

안전 문제 또는 P0가 한 건이라도 생기면 신규 세션을 중단한다. P1은 원인과 재현을 확인하고 수정·회귀 검증 전까지 재개하지 않는다. 실패 기록을 삭제하거나 성공 행으로 덮어쓰지 않는다.

## 실행 순서

1. 시작 전 게이트와 참여 동의를 확인한다.
2. 참여자별 두 세션을 수행하고 원본 증거를 로컬 증거 폴더에 둔다.
3. CSV에 성공·실패·오류를 그대로 기록한다.
4. 매일 실패 단계, 오류 코드, 문장·추천 변경을 분류한다.
5. 반복 중단 단계와 P0/P1을 수정하고 같은 빌드·레시피 버전 조건으로 회귀 검증한다.
6. `pnpm check:phase7-private-beta`를 실행한다.
7. 모든 기준이 통과하면 승인자가 `docs/phase-7-public-beta-approval.md`를 증거와 함께 갱신하고 검증기를 다시 실행한다.

현재는 참여 세션 0건, 공개 베타 승인 미확인 상태이므로 의도적으로 차단된다.
