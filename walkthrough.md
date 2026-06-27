# 집밥노트 코드 개선 및 출시 준비 워크스루

Updated: 2026-05-30 KST

## 목적

집밥노트 하이브리드 앱의 App Store 및 Google Play Store 출시 준비를 위해 성능, 보안, 릴리즈 게이트 관점의 코드 개선 사항과 남은 운영자 작업을 한 곳에 정리합니다.

## 완료된 코드 변경

### 1. 식약처 재료 API 런타임 동적 호출 제거

대상 파일:

- `scripts/build-ingredients-catalog.mjs`
- `app/api/ingredients/route.ts`
- `lib/ingredients-catalog-data.json`
- `package.json`

변경 내용:

- `/api/ingredients`에서 식약처 API를 런타임에 여러 번 호출하던 로직을 제거했습니다.
- `prebuild` 단계에서 `scripts/build-ingredients-catalog.mjs`가 재료 카탈로그 JSON을 생성합니다.
- 런타임 API route는 `lib/ingredients-catalog-data.json`을 읽어 즉시 응답합니다.
- API 키가 없거나 식약처 API 호출이 실패하면 로컬 fallback 카탈로그로 빌드됩니다.

출시 효과:

- 런타임 504 Gateway Timeout 가능성을 줄입니다.
- Cloudflare/OpenNext Worker에서 외부 API 지연에 의해 재료 검색 API가 막히는 위험을 줄입니다.

### 2. 계정 삭제 데이터 정리 경로를 Supabase auth 삭제 트리거로 이동

대상 파일:

- `supabase/migrations/20260530000000_cascade_user_deletion.sql`
- `app/api/account-deletion-requests/[id]/route.ts`
- `tests/account-deletion-cascade.test.ts`

변경 내용:

- API route에서 사용자별 public 테이블을 순차 삭제하던 `deleteRowsForUser` 루프를 제거했습니다.
- `client.auth.admin.deleteUser(userId)` 실행 시 `auth.users` 삭제 트리거가 사용자 데이터를 정리하도록 변경했습니다.
- 트리거는 `account_deletion_requests`의 `user_id`, `email`, `reason`을 먼저 null 처리해 PII 잔존 위험을 줄입니다.
- `security definer` 함수에 `set search_path = public, auth`를 명시했습니다.

출시 효과:

- 계정 삭제 중 일부 테이블만 삭제되는 비원자적 실패 위험을 줄입니다.
- 계정 삭제 요청 처리 중 route 후속 update가 실패해도 DB 트리거에서 요청 PII가 익명화됩니다.

### 3. 로그인 후 디바이스 데이터 이전 병렬화

대상 파일:

- `lib/migrate-device-data.ts`

변경 내용:

- `ingredients`, `shopping_items`, `favorites`, `community_posts`, `community_comments`, `community_likes` 이전을 순차 `await` 루프에서 `Promise.all` 병렬 실행으로 변경했습니다.
- 각 테이블 이전은 기존처럼 table-level result를 반환하며, missing table은 skipped로 유지합니다.

출시 효과:

- 모바일 네트워크 지연 환경에서 로그인 직후 게스트 데이터 이전 시간을 줄입니다.
- 기존 migration summary UI와 오류 표시 계약은 유지합니다.

## 현재 검증 결과

현재 세션에서 확인한 항목:

- targeted tests: `pnpm exec node --experimental-strip-types --test tests/account-deletion-cascade.test.ts tests/local-mode-release.test.ts tests/recipe-comments.test.ts` 통과
- typecheck: `pnpm exec tsc --noEmit` 통과
- unit/repo tests: `pnpm test` 241개 통과
- CI static release gate: 샌드박스 밖 `pnpm release:ci-static-check` 10개 gate 통과
- local release gate: `pnpm release:check` 9개 gate 통과
- production build: 샌드박스 밖 `pnpm build` 통과
- 정적 카탈로그 상태: `lib/ingredients-catalog-data.json` 존재, 현재 fallback 69개 재료

목표 완료 게이트는 아직 외부 증거가 필요합니다:

```bash
pnpm release:goal-check
```

현재 `pnpm release:goal-check`는 `Passed: 14`, `Blocked: 2`, `Missing: 0`입니다.

## 운영자 핸드오프

### 1. Google Play Developer API 자격 증명 설정

`docs/store-api-credentials-runbook.md`를 기준으로 서비스 계정 키 JSON을 발급하고 아래 경로에 저장합니다.

```bash
.release-secrets/google-play-service-account.json
chmod 600 .release-secrets/google-play-service-account.json
```

`.env.store-api.local`에는 실제 값 대신 로컬 ignored secret 경로를 사용합니다.

```bash
GOOGLE_APPLICATION_CREDENTIALS=.release-secrets/google-play-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.jipbab.note
GOOGLE_PLAY_VERSION_CODE=1
GOOGLE_PLAY_TRACK=internal
```

### 2. Cloudflare Worker 런타임 secrets 설정

Cloudflare Dashboard 또는 Wrangler CLI에서 아래 runtime secret을 설정합니다.

```bash
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAILS
MFDS_API_KEY
```

실제 secret 값은 repo, 문서, 채팅에 남기지 않습니다.

### 3. 실제 기기 수동 QA

실제 iPhone 및 Android 단말기에서 아래 항목을 확인합니다.

- Google OAuth
- Apple OAuth
- Kakao OAuth
- 로컬 알림 권한 및 예약
- 장보기 외부 링크
- 계정 삭제 요청
- raw provider error 미노출
- 냉장고, 가족 냉장고, 추천 레시피, 부족 재료 장보기 핵심 흐름

QA 패킷 생성:

```bash
pnpm release:capture-real-device-qa
```

완료 후 `docs/real-device-qa.md`의 Required Confirmation Strings를 실제 날짜와 증거 경로로 갱신합니다.

### 4. 최종 제출 게이트

모든 수동 QA와 외부 콘솔 설정이 끝난 뒤 실행합니다.

```bash
pnpm release:submit-gate
pnpm release:capture-operator-handoff
```

## 현재 남은 blocker

- Android ADB는 Mac USB 레벨에서 `SAMSUNG_Android`가 보이지만 `adb devices -l`에는 아직 비어 있어 Android 실기기 QA를 진행할 수 없습니다.
- Play Console internal testing 증거는 아직 필요합니다.
- Cloudflare runtime secrets, custom domain, Supabase Auth redirect, 모바일 `CAPACITOR_SERVER_URL` 운영 전환은 외부 설정 완료 후 확인해야 합니다.
