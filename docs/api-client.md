# 공통 API 클라이언트 계약

Updated: 2026-07-15 KST

## 적용 범위

`lib/api-client.ts`는 브라우저에서 집밥노트 API를 호출하는 공통 경계다. 레시피 API v1 목록·추천·상세·피드백뿐 아니라 댓글, 가족 공유, 바코드 조회, 직접 계정 삭제, 운영자 계정 삭제 요청, 익명 사용자 병합이 모두 이 경계를 사용한다.

FE-001의 프런트 직접 `fetch` 마이그레이션은 완료했다. 앱 코드에서 남은 `fetch`는 공통 클라이언트 내부와 서버가 Open Food Facts를 조회하는 `app/api/products/route.ts`뿐이다. 서버의 외부 dependency transport는 브라우저 클라이언트 마이그레이션 범위가 아니다.

## 요청 계약

- 기본 `Accept: application/json`, JSON 본문에는 `Content-Type: application/json`을 사용한다.
- 모든 시도에 bounded `X-Client-Request-Id`를 보내고 같은 요청의 재시도 동안 값을 유지한다.
- bearer token은 명시적으로 전달된 경우에만 `Authorization`에 넣는다.
- 기본 timeout은 8초이며 호출자가 전달한 취소 signal을 우선한다.
- API v1의 `{ data, meta? }` envelope는 `requestApiData`가 검증하고, 기존 최상위 JSON과 댓글 삭제 `204 No Content`는 `requestApi`가 상태·request ID와 함께 기능별 런타임 parser에 전달한다.
- 댓글·가족·바코드·계정 삭제·익명 병합 parser는 필요한 성공 필드가 없으면 bounded `INVALID_RESPONSE`로 fail-closed한다.
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
node --experimental-strip-types --test tests/api-client.test.ts tests/frontend-api-client-migration.test.ts
pnpm test
pnpm test:integration
pnpm test:content
pnpm release:ci-static-check
pnpm release:security-check
pnpm exec next build
```

2026-07-15 공통 경계 계약 11개와 프런트 경계·hydration 계약 2개, 전체 단위 테스트 495개가 통과했다. CI-safe 19/19, release security 4/4, integration, 콘텐츠 검증, production build 40/40 경로도 통과했다.

인앱 브라우저 390x844에서 실제 `/barcode` 최상위 JSON 응답과 상품 없음 fallback을 확인했고 가로 넘침, 44px 미만 조작부, console error·warning은 모두 0건이었다. `/account-delete`의 로그아웃 안내와 `/family` 화면도 390/390 폭과 console error·warning 0건을 확인했다. 이 과정에서 발견한 바코드 카메라 지원 여부의 hydration 불일치는 첫 렌더를 고정하고 마운트 뒤 capability를 판정하도록 수정했다. 댓글·가족·계정 삭제의 인증 성공 경로는 계정과 운영 DB 증거 없이 브라우저 통과로 승격하지 않는다.

## 다음 마이그레이션 주의점

- cross-origin `NEXT_PUBLIC_API_BASE_URL`을 사용한다면 서버 CORS allowlist에 `X-Client-Request-Id`와 필요한 인증 헤더를 명시해야 한다.
- 인증·관리 mutation은 기본 재시도 금지를 유지하며 실제 계정 QA에서 권한 음수 경로와 삭제 확인 경계를 다시 확인한다.
- 멱등성이 증명되지 않은 mutation에는 `retry: true`를 사용하지 않는다.
