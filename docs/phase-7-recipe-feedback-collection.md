# Phase 7 레시피 피드백 수집 구현

Updated: 2026-07-14 KST

## 범위

계획서의 `API-007 레시피 피드백 API`, `FE-015 조리 완료`, Phase 7의 실패 단계 수집을 구현했다. 실제 베타 사용자 5~20명 수행, 핵심 20개 실제 조리 검수, 운영 DB migration은 이 구현과 별도 증거 게이트로 유지한다.

## 사용자 흐름

- 조리 중 `현재 단계에서 조리를 멈췄어요`를 누르면 현재 단계를 기본 실패 단계로 제안한다.
- 첫 질문은 `혼자서 완성할 수 있었나요?`이며 `네, 잘 완성했어요.`, `완성했지만 어려웠어요.`, `중간에 실패했어요.` 중 하나를 선택한다.
- 실패한 경우 레시피 단계와 계획서의 8개 실패 이유를 선택한다. 실패 이유는 선택 항목이며 자유서술은 받지 않는다.
- 조리 시작 시각과 완료 또는 중단 시각이 모두 있으면 최대 12시간 범위의 실제 조리 초를 계산한다.
- 피드백은 먼저 version 2 로컬 진행상태에 저장한다. 서명된 사용자 또는 서명된 익명 세션이 있으면 서버 전송을 시도하고, 세션이나 서버가 준비되지 않으면 기기에만 저장됐다고 표시한다.
- 동일한 `clientSubmissionId` 재시도는 중복 행을 만들지 않는다.

## API와 저장소

- `POST /api/v1/recipe-feedback`는 4KB 본문, 분당 12회 분산 제한, 검증된 Bearer 세션을 요구한다.
- 허용 필드는 제출 UUID, 레시피 UUID·버전, 완성 상태, 실패 단계·이유, 실제 조리시간뿐이다. 알 수 없는 필드와 자유서술은 거부한다.
- `recipe_feedback`은 레시피·사용자 FK, 상태 일관성, 실패 단계, 이유, 조리시간, 사용자별 제출 UUID 유일성 제약을 가진다.
- `anon`과 `authenticated`는 테이블을 직접 읽거나 쓸 수 없다. 검증된 사용자 ID를 확인한 서버만 `service_role`로 삽입하고 원시 DB 오류는 응답하지 않는다.
- rollback은 모든 런타임 권한을 회수하되 이미 모은 비공개 베타 증거를 삭제하지 않는다.

## 개인정보 최소화

- 이름, 이메일, 전화번호, 계정 메타데이터, 기기 ID, 자유서술을 요청 본문과 로컬 진행상태에 넣지 않는다.
- DB의 `comment` 열은 향후 별도 동의 흐름을 검토하기 전까지 `null`만 허용한다.
- 서명된 익명 사용자도 Supabase가 발급하고 서버가 검증한 `auth.uid()`만 사용한다. 호출자가 정한 `x-device-id`는 인증에 사용하지 않는다.
- 피드백 API와 UI는 analytics 이벤트에 레시피 메모나 자유 텍스트를 전달하지 않는다.

## 검증 증거

- 순수 로직·정적 계약 테스트: 피드백 허용·거부, v1 로컬상태 마이그레이션, 실패 단계 일관성, 직접 app-role 접근 차단, 비파괴 rollback을 포함한다.
- 인앱 브라우저의 실제 컴포넌트 임시 QA 경로에서 390px 콘텐츠 폭과 가로 넘침 없음, 최소 버튼 높이 44px, 상태·단계·이유 선택, 텍스트 입력 0개, 서버 미준비 로컬 저장 문구를 확인했다.
- 화면 증거: `output/ui-evidence/phase7-recipe-feedback-failure-390.png`이며 `output/` 정책에 따라 Git에는 넣지 않는다.
- 전체 단위 테스트 433/433, API v1 계약 18/18, CI-safe 출시 게이트 19/19, Supabase 계약 146/146, 보안 게이트 4/4, 타입 검사와 production build 40개 경로가 통과했다. lint는 오류 0건이며 기존 생성물 경고 33건만 남았다.
- 실제 로컬 HTTP에서 무서명 `POST`는 redacted `401 UNAUTHORIZED`와 `no-store`·request ID를, `GET`은 `405`, 4KB 초과 본문은 `413 INVALID_BODY`를 반환했다. 운영 로그에는 허용된 endpoint·status·latency·error code·request ID·deployment SHA만 남았다.

## 미완료와 재개 조건

- migration은 production 또는 staging에 적용하지 않았다. migration history, 복구 가능한 백업, 격리 staging이 준비된 뒤 적용한다.
- 정상 서버 저장 201, 동일 제출 200, 검증된 세션의 잘못된 본문 400, 제한 429, 저장소 미준비 503은 staging HTTP로 재검증해야 한다. 로컬에서 확인한 401·405·413도 staging에서 반복한다.
- 실제 사용자 결과는 아직 0건이다. 이 화면 QA와 합성 테스트는 Phase 5 실제 조리 또는 Phase 7 비공개 베타 증거를 대신하지 않는다.
- 재료 소진, 남은 음식 보관 응답, 다시 만들 의향은 이번 최소 실패 단계 수집 범위에 포함하지 않았으며 별도 제품 결정을 거쳐야 한다.

## 보안 게이트와 잔여 위험

- secret·token·원시 오류를 코드, 응답, 피드백 행에 넣지 않았고 production dependency audit은 moderate 이상 알려진 취약점 0건이다.
- 인증은 검증된 Supabase 세션과 server-only insert로 제한하며 app role은 테이블 직접 접근이 없다.
- exact-key body 검증, DB 제약, 4KB 상한, 분산 rate limit, 멱등 제출, 비파괴 rollback과 인증·본문 음수 테스트가 있다.

| 잔여 위험 | Owner | Due | 현재 상태 |
|---|---|---|---|
| feedback migration과 권한을 실제 PostgreSQL에서 검증하지 않음 | FullStackDev + Release | 2026-07-18 재평가 | blocked-external: migration history·backup·staging 필요 |
| 정상 저장·멱등·429·503 HTTP 경로 미검증 | FullStackDev + QA | 2026-07-18 재평가 | 위 staging 적용 후 실행 |
| 익명 인증의 대량 계정 생성·정리 정책 미승인 | Security + Backend | 2026-07-18 재평가 | `NEXT_PUBLIC_SUPABASE_ANONYMOUS_AUTH_ENABLED=false` 유지 |
| 실제 사용자 실패 데이터·안전 신호 0건 | Product + QA | 첫 비공개 베타 세션 전 | Phase 5·7 증거 게이트 유지 |
