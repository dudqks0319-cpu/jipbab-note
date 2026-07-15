# 공통 API 클라이언트 계약

Updated: 2026-07-15 KST

## 적용 범위

`lib/api-client.ts`는 API 응답 envelope를 읽는 공통 경계다. 현재 FE-001 핵심 범위인 레시피 API v1 목록, 추천, 상세, 피드백 요청이 이 경계를 사용한다.

FE-001 전체 마이그레이션은 아직 아니다. 댓글, 가족 공유, 계정 삭제, 바코드, 익명 사용자 병합 화면의 직접 `fetch`는 각각의 인증·오류 UX 계약을 고정한 뒤 이 경계로 옮긴다. 서버의 외부 상품 조회는 브라우저 클라이언트 마이그레이션 범위가 아니다.

## 요청 계약

- 기본 `Accept: application/json`, JSON 본문에는 `Content-Type: application/json`을 사용한다.
- 모든 시도에 bounded `X-Client-Request-Id`를 보내고 같은 요청의 재시도 동안 값을 유지한다.
- bearer token은 명시적으로 전달된 경우에만 `Authorization`에 넣는다.
- 기본 timeout은 8초이며 호출자가 전달한 취소 signal을 우선한다.
- 응답은 `{ data, meta? }` envelope만 성공으로 인정하고 런타임 parser를 통과시킨다.
- 서버 request ID는 허용된 문자와 길이만 보존한다.

## 재시도와 오류 계약

- GET과 HEAD는 `408`, `429`, `502`, `503`, `504` 또는 네트워크·timeout 오류에서 기본 한 번만 재시도한다.
- POST는 기본 재시도하지 않는다. 읽기 전용 추천과 `clientSubmissionId`로 멱등인 피드백만 호출부에서 명시적으로 한 번 재시도한다.
- `Retry-After`가 허용된 최대 지연보다 길면 즉시 typed error를 반환해 과호출과 긴 UI 정지를 막는다.
- `401`은 재시도하지 않는 인증 오류로 전달한다. 토큰 갱신이나 강제 로그아웃은 기능별 인증 흐름이 결정한다.
- 네트워크·timeout 오류는 raw transport error, bearer token, 요청 본문을 복사하거나 로그로 남기지 않는다.
- 서버 오류 code, message, request ID는 bounded 형식만 사용자 경계로 전달한다.

## 검증

```bash
node --experimental-strip-types --test tests/api-client.test.ts tests/recipe-api-v1.test.ts
pnpm test
pnpm release:ci-static-check
pnpm release:security-check
pnpm exec next build
```

2026-07-15 브라우저 수동 QA에서는 첫 `503` 뒤 같은 correlation ID로 두 번째 요청이 성공했고, `Retry-After: 60`인 `429`는 한 번만 호출했으며, 진행 중 사용자 취소는 추가 재시도 없이 끝났다. 임시 QA route는 검증 직후 제거했다.

## 다음 마이그레이션 주의점

- cross-origin `NEXT_PUBLIC_API_BASE_URL`을 사용한다면 서버 CORS allowlist에 `X-Client-Request-Id`와 필요한 인증 헤더를 명시해야 한다.
- 인증·관리 화면은 기존 UX와 권한 음수 경로를 테스트로 고정한 뒤 한 기능씩 옮긴다.
- 멱등성이 증명되지 않은 mutation에는 `retry: true`를 사용하지 않는다.
