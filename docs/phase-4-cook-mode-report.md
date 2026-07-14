# Phase 4 조리 모드 완료 보고서

작성일: 2026-07-11 KST

## 2026-07-14 후속 상태

- 이 문서 작성 당시 후속 범위였던 `/api/v1/recipe-feedback`, 실패 단계, 어려웠던 단계, 맛 결과, 다시 만들 의향 수집은 로컬 구현을 마쳤다. migration 적용과 staging HTTP 검증은 아직 수행하지 않았다.
- 모든 단계 완료 후 실제 조리시간·보관/재가열 안내·즐겨찾기·냉장고 재료 소진을 한 완료 화면에서 제공한다. 재료는 사용자가 선택하고 실행한 경우에만 `consume` 기록으로 남으며 냉장고에서 되돌릴 수 있다.
- 여러 기기 간 진행상태를 동기화하는 `/api/v1/recipe-progress`는 여전히 미구현이다.
- 현재 계약과 증거는 `docs/phase-7-recipe-feedback-collection.md`를 기준으로 한다.

## 변경 전 상태와 원인

- 타이머가 1초마다 state를 감소시켜 백그라운드·화면 잠금 동안 실제 시간과 어긋날 수 있었다.
- API v1의 초 단위·timer preset 값을 분 단위로 반올림했다.
- 단계 체크, 현재 단계, 완료, 피드백이 새로고침과 앱 복귀 후 사라졌다.
- 화면 꺼짐 방지, 종료 진동·소리, 완료 피드백이 없었다.

## 변경 파일

- `components/recipe/RecipeCookMode.tsx`
- `lib/recipe-cook-progress.ts`
- `lib/recipe-api-v1-client.ts`
- `types/index.ts`
- `app/recipe/[id]/page.tsx`
- `tests/recipe-cook-progress.test.ts`
- `tests/recipe-api-v1.test.ts`

## 구현 결과

- 타이머는 감소 counter가 아니라 절대 `endsAt`을 저장하고 `Date.now()`로 남은 초를 계산한다.
- `visibilitychange`와 `focus`에서 즉시 시간을 재계산해 백그라운드 복귀를 보정한다.
- API v1의 `durationSecondsMin`, `durationSecondsMax`, `timerPresetSeconds`를 화면 모델에 보존한다.
- 단계 체크, 현재 단계, 활성 타이머, 완료 시각, 난이도 피드백을 레시피별 versioned local key에 저장한다.
- 저장 데이터는 현재 레시피의 유효한 step index와 최대 24시간 timer만 복원한다. 손상된 값은 fail-closed로 폐기한다.
- 실행 중 screen Wake Lock을 요청하고 가시 화면 복귀 시 재요청한다. 지원하지 않거나 거부되면 조리 자체는 계속된다.
- 타이머 종료 시 사용자 동작으로 준비된 Web Audio 신호와 진동을 시도하고, `aria-live=assertive`로 종료를 알린다.
- 진행률은 `progressbar` 의미와 값을 제공한다. 모든 단계를 완료하면 난이도 피드백과 초기화 동작을 제공한다.

## 테스트와 실제 구동

- `pnpm test`: 343/343 통과. 기존 unused import 경고 1건만 남아 있다.
- `pnpm build`: 성공, 임시 하네스 제거 후 38 pages/routes 생성.
- 순수 로직 테스트: 절대 종료 시각, background gap 계산, 음수·24시간 초과 거부, current step allowlist 복원, malformed state 거부.
- API detail mapper 테스트: 초 단위 최소 시간과 timer preset 보존.
- 임시 개발 하네스 실제 구동: 390px에서 2초 타이머가 `타이머 완료`로 전환됐고, 3단계 완료 후 `100%`와 완료 피드백이 표시됐다.
- `괜찮아요` 선택 후 페이지 reload에서 100%, 완료 카드, pressed feedback, 저장 key가 복원됐다.
- 역사적으로 종료된 timer를 reload할 때 진동·AudioContext를 다시 실행하던 console 경고를 발견해, hydrated expired timer를 이미 알림 처리된 상태로 복원했다. 재검증 console error/warning은 0건이었다.
- Evidence: `output/ui-evidence/phase4-cook-mode-restored-390.png`.

## 2026-07-11 당시 데이터베이스·API·배포

- 데이터베이스 변경 없음.
- 당시 새 API는 없었다. 이후 `/api/v1/recipe-feedback`과 두 개의 비공개 feedback migration을 구현했으며 `/api/v1/recipe-progress`는 여전히 후속 범위다.
- 현재 구현은 기기 로컬 오프라인 진행 복원이며 다른 기기 동기화는 주장하지 않는다.
- 이후 content commit `a1b7e0f`를 GitHub에 push하고 Vercel production deployment `dpl_7HQNoLYJMnSxEShYtEJNEMYXM9Ku`로 배포했다. Supabase migration과 server secret은 변경하지 않았다.

## 보안 게이트와 잔여 위험

- secret, auth token, PII를 저장하지 않는다. local key에는 recipe ID, step index, timer, 완료 시각과 고정 선택형 피드백만 저장한다.
- 저장 입력은 버전·타입·step allowlist·timer 상한으로 검증한다.
- 새 의존성 없음. 기존 release security gate 상태를 유지한다.
- `P0 / FullStackDev+QA / staging v2 fixture 후`: 실제 공개 상세에서 timer, 앱 background/foreground, 화면 잠금, iOS/Android 진동·소리를 실기기로 재검증해야 한다.
- `P1 / FullStackDev+Backend / 로그인 동기화 결정 후`: 여러 기기 진행 동기화가 제품 요구라면 인증된 progress/feedback API와 RLS migration을 별도 설계한다.
- `P1 / Product+QA / beta 전`: 완료 피드백 문구와 timer 종료 음량·진동 패턴을 초보자 5명 이상으로 확인한다.
