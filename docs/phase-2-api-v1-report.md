# Phase 2 API v1 완료 보고서

작성일: 2026-07-10 KST

## 변경 전 상태

- 공개 레시피 API는 legacy JSONB와 기존 앱 계약을 사용했고, 정규화된 v2 재료·단계·출처를 반환하는 버전 경계가 없었다.
- 추천 결과는 새 API 계약으로 보유·부족 재료 근거를 전달하지 않았다.
- 서버 인스턴스 간 공유되는 레이트 리밋 저장소가 없었다.
- 운영 DB에는 v2 발행 가능한 레시피와 `recipe_sources`가 0건이며, migration history가 로컬과 불일치한다.

## 문제 원인

- Phase 1이 데이터 구조와 발행 증거를 정의했지만, 공개 소비자가 사용할 fail-closed API 계층이 없었다.
- 서비스 역할 클라이언트는 RLS를 우회하므로 API 쿼리와 응답 조립 단계에서 발행 조건을 다시 강제해야 했다.
- 프로세스 메모리 기반 제한기는 다중 인스턴스 배포에서 전역 제한을 보장하지 못한다.

## 변경 파일

- API 계약: `lib/api-v1-contract.ts`, `lib/api-v1-envelope.ts`, `lib/api-v1-response.ts`
- 데이터·추천: `lib/recipe-api-v1-repository.ts`, `lib/recipe-recommendation-v1.ts`
- 라우트: `app/api/v1/recipes/route.ts`, `app/api/v1/recipes/[id]/route.ts`, `app/api/v1/recommendations/route.ts`
- 레이트 리밋: `lib/distributed-rate-limit.ts`
- 정적 게이트: `scripts/check-api-v1-contract.mjs`, `scripts/check-supabase-release.mjs`, `scripts/run-ci-release-gates.mjs`, `scripts/run-release-gates.mjs`
- 운영 문서: `docs/api-v1-operations.md`, `docs/external-release-unblock-runbook.md`
- 회귀 테스트: `tests/api-v1-contract.test.ts`, `tests/distributed-rate-limit.test.ts`, `tests/recipe-api-v1.test.ts`, `tests/recipe-recommendation-v1.test.ts`

## 데이터베이스 변경

- `20260710160000_add_distributed_api_rate_limits.sql`은 HMAC 가명 키만 저장하는 `api_rate_limit_buckets`와 원자적 fixed-window RPC를 추가한다.
- 테이블은 RLS가 활성화되고 `anon`·`authenticated` 직접 권한이 없다. RPC는 고정 `search_path`와 `service_role` 실행 권한만 가진다.
- rollback은 RPC 접근을 제거하되 이미 생성된 가명 카운터를 파괴하지 않는다.
- migration과 서버 비밀은 staging/production에 적용하지 않았다. `supabase db push`도 실행하지 않았다.

## API 변경

- `GET /api/v1/recipes`: 카테고리·난이도·시간·재료·제외 재료·최대 부족 수·opaque keyset cursor 필터를 제공한다.
- `GET /api/v1/recipes/:id`: 정규화 재료, 대체재, 단계, 단계별 재료 사용, 출처, 안전 문구, 보관·재가열 안내를 반환한다.
- `POST /api/v1/recommendations`: 보유·임박·제외 재료와 시간·난이도 조건을 검증하고, 일치·부족 재료와 한국어 추천 근거를 반환한다.
- 목록과 상세는 `schema_version = 2`, 승인, 초보자 검수, 실제 조리, 식품 안전, 이미지 권리, 출처, 발행 시각 조건을 쿼리와 응답 조립에서 중복 확인한다. 목록도 정규화된 재료·단계·사용 관계·출처가 상세 계약을 통과한 레시피만 카드로 반환한다.
- 목록 정렬은 `recommended`, `most-owned`, `least-missing`, `fastest`, `recent`를 지원하고, cursor를 다른 정렬과 섞으면 거부한다.
- 모든 응답은 공통 봉투, `X-Request-Id`, `Cache-Control: no-store`를 사용한다. 제한·의존성 오류에는 `Retry-After`가 포함된다.
- 운영 레이트 리밋 비밀 또는 DB RPC가 없으면 in-memory로 우회하지 않고 `503 DEPENDENCY_NOT_READY`로 닫힌다.

## UI 변경

- 없음. 기존 화면을 API v1로 전환하는 작업은 Phase 3 범위다.
- Phase 2에서는 HTTP 표면과 모바일 화면의 기존 fail-closed 발행 상태를 분리해 검증했다.

## 테스트 결과

- `pnpm test`: 339/339 통과. 기존 `upload-appstore-screenshots.mjs` unused import 경고 1건은 오류가 아니다.
- API v1 집중 테스트: 21/21 통과.
- `pnpm check:api-v1-contract`: 14/14 통과.
- `pnpm check:supabase-release`: 145/145 통과.
- `pnpm test:content`, `pnpm test:integration`, `pnpm release:security-check`: 통과.
- `pnpm release:ci-static-check`: 12/12 통과.
- `pnpm release:check`: 11/11 통과.
- `pnpm build`: 성공, v1 목록·상세·추천 동적 경로 포함.
- `pnpm cloudflare:build`: OpenNext bundle 생성 성공.
- HTTP 수동 검증: 잘못된 검색·커서·ID·추천 본문은 400, 16KB 초과 본문은 413, 제한 초과는 429, DB 계약 미적용 정상 요청은 503으로 응답했다. 모두 내부 오류나 환경변수를 노출하지 않고 요청 ID를 반환했다.
- production `next start`를 비밀 미설정 상태로 기동해 목록·상세·추천 3개 경로가 모두 redacted `503 DEPENDENCY_NOT_READY`와 `Retry-After`를 반환하는 것을 확인했다.

## 실패한 테스트와 해결

- 새 API 정적 검사기의 첫 실행이 집계 함수 인자를 잘못 전달해 `Passes: 0`, `Failures: 0`으로 잘못 통과했다. 집계를 수정한 뒤 실제 12개 검사를 다시 실행해 12/12를 확인했다.
- 최초 개발 서버 명령은 기존 package script 인자 뒤에 불필요한 `--`를 전달해 프로젝트 경로 오류로 종료됐다. `pnpm exec next dev --webpack -H 127.0.0.1 -p 3191`로 다시 기동해 HTTP 검증을 완료했다.
- 정렬 테스트의 첫 fixture는 총 5분인데 준비 2분+조리 10분으로 모순되어 발행 게이트에서 제외됐다. 준비 1분+조리 4분으로 고친 뒤 정렬 결과 5종을 검증했다.
- 제품 코드 회귀 테스트 실패는 없었다.

## 보안 게이트

1. Secrets: 새 비밀값은 없고 `.env.example`에는 빈 server-only 이름만 추가했다. 추적 secret 검사 통과.
2. AuthN/AuthZ: 공개 조회만 제공하며 DB mutation은 없다. 서비스 역할 우회를 쿼리와 조립 단계에서 재검사하고 rate RPC는 service-role only다.
3. 입력·출력: query, ID, cursor, sort, 배열, 정수, JSON shape, byte 크기를 제한한다. JSON 응답은 공통 봉투를 사용하고 내부 오류를 전달하지 않는다.
4. Dependencies: 새 의존성 없음. production dependency audit moderate 이상 알려진 취약점 0건.
5. 민감정보: 원본 IP/게스트 키를 저장하지 않고 HMAC 가명값만 저장한다. secret·stack·DB 오류 redaction 런타임 확인.
6. Abuse controls: 엔드포인트별 분산 제한, 429/Retry-After, production fail-closed, 비운영 Map 상한을 적용했다.
7. 음성 테스트: unsigned guest 권한, 잘못된 query/cursor/body, chunked 초과, 429, 503, 불완전 정규화 데이터가 회귀 테스트와 HTTP 검증에 포함된다.
8. 잔여 위험: 아래 항목마다 owner와 완료 시점을 지정했으며 staging·운영 미검증 상태를 분리했다.

## 해결하지 못한 위험

- `P0 / FullStackDev+DBA / Phase 2 운영 전`: remote migration history를 복구하고 복원 가능한 백업과 격리 staging PostgreSQL에서 Phase 0·1·2 migration을 순서대로 실행해야 한다.
- `P0 / FullStackDev+Content QA / API 클라이언트 전환 전`: 실제 v2 공개 후보가 0건이므로 staging에 검수된 fixture를 준비해 목록·상세·추천 정상 200 경로를 실제 DB에서 검증해야 한다.
- `P0 / Platform+Security / API 운영 전`: 서버 전용 `API_RATE_LIMIT_HMAC_SECRET`을 staging/production secret store에 등록하고 RPC 장애, 429, 회복을 검증해야 한다.
- `P1 / Platform+Security / 공개 트래픽 전`: `x-forwarded-for` 계열 헤더는 신뢰 프록시 경계에서만 덮어써지도록 Vercel/Cloudflare 구성을 확인해야 한다. 현재 HMAC은 저장 PII를 보호하지만 스푸핑 가능한 프록시 헤더 자체를 인증하지는 않는다.
- API v1 정상 데이터 경로와 Phase 3 UI는 staging DB와 검수 데이터가 준비되기 전까지 완료로 주장하지 않는다.

전역 리뷰와 세 가지 런타임 가설 증거는 `docs/phase-2-debug-audit.md`에 기록했다.
