# API v1 운영 계약

## 범위

`/api/v1/recipes`, `/api/v1/recipes/:id`, `/api/v1/recommendations`는 검수 완료된 `schema_version = 2` 레시피만 반환한다. 서비스 역할 클라이언트를 사용하더라도 애플리케이션 쿼리와 응답 조립 단계에서 발행 조건을 다시 검사한다. 정규화된 재료, 단계, 재료 사용 관계, 출처, 안전 문구 또는 복구 안내가 불완전하면 목록과 상세 응답 모두 공개되지 않는다.

목록의 `sort`는 `recommended`(기본값), `most-owned`, `least-missing`, `fastest`, `recent`만 허용한다. `recent`는 발행 시각·ID keyset cursor를 사용하고, 나머지 정렬은 현재 출시 최대치인 200개 후보 안에서 정렬 고정 offset cursor를 사용한다. cursor는 정렬 종류와 일치하지 않으면 거부된다.

## 응답과 오류

- 성공: `{ "data": ..., "meta": { "requestId": "..." } }`
- 실패: `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`
- 모든 응답은 `Cache-Control: no-store`와 `X-Request-Id`를 포함한다.
- 제한 초과 또는 의존성 미준비 응답은 `Retry-After`를 포함한다.
- 서버 예외, 환경변수 이름, 스택, DB 오류 본문은 응답이나 로그로 전달하지 않는다.

## 분산 레이트 리밋

운영에서는 `API_RATE_LIMIT_HMAC_SECRET`이 32자 이상이어야 한다. 원본 IP 또는 사용자 키는 저장하지 않고 HMAC-SHA256 가명값만 `api_rate_limit_buckets`에 저장한다. 원자적 fixed-window RPC는 `service_role`만 실행할 수 있다. 운영 비밀 또는 RPC가 준비되지 않으면 API는 in-memory 제한기로 우회하지 않고 `503 DEPENDENCY_NOT_READY`로 닫힌다.

비밀은 서버 런타임의 암호화 환경변수로만 설정한다. 저장소, `NEXT_PUBLIC_*`, 로그, 증거 파일에 넣지 않는다. 예시 생성 명령은 값을 화면이나 이 문서에 복사하지 않는 전제에서 다음과 같다.

```bash
openssl rand -base64 48
```

## 배포 순서

1. 운영 migration history와 복구 가능한 백업을 먼저 확인한다.
2. staging에 Phase 0, Phase 1 migration을 순서대로 적용하고 capture/restore 및 권한 음성 경로를 검증한다.
3. staging에 `20260710160000_add_distributed_api_rate_limits.sql`을 적용한다.
4. staging 서버에 `API_RATE_LIMIT_HMAC_SECRET`을 설정한다.
5. 목록·상세·추천의 정상 경로, 잘못된 필터/커서/본문, `429`, 의존성 장애 `503`을 HTTP로 검증한다.
6. matching app build와 DB migration을 조정된 변경 창에 운영 반영한다.
7. 운영 스모크와 모니터링을 확인한 뒤에만 API 사용 클라이언트를 전환한다.

운영 migration history가 현재 로컬과 불일치하므로 이 문서 작성 시점에는 `supabase db push`를 실행하지 않는다.

## 로컬 검증

```bash
pnpm check:api-v1-contract
pnpm check:supabase-release
node --experimental-strip-types --test \
  tests/api-v1-contract.test.ts \
  tests/distributed-rate-limit.test.ts \
  tests/recipe-api-v1.test.ts \
  tests/recipe-recommendation-v1.test.ts
```
