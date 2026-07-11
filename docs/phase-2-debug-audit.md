# Phase 2 전역 리뷰·디버깅 감사

작성일: 2026-07-10 KST

## 검토 범위

- API v1 목록·상세·추천 라우트와 공통 응답 계약
- 공개 조건의 서비스 역할 우회 보상 검사
- 분산 레이트 리밋 SQL, 런타임 fallback, rollback
- cursor, 정렬, 정규화 관계, 본문 크기, 오류 redaction
- CI·로컬 릴리스·Next·OpenNext 빌드 경로

## 디버깅 가설과 런타임 증거

### 가설 1: Content-Length가 없는 요청이 추천 본문 제한을 우회한다

- 확인: 최초 구현은 헤더만 검사한 뒤 `request.json()`으로 전체 본문을 읽었다.
- 수정: stream chunk를 합산하는 `readBoundedJsonObject`를 추가하고 16KB 초과 시 즉시 중단한다.
- 런타임 증거: HTTP/1.1 chunked 17,000-byte 요청이 `413 INVALID_BODY`를 반환했고 `X-Request-Id`를 포함했다.
- 회귀 증거: `bounded JSON parsing rejects chunked bodies beyond the API limit` 통과.

### 가설 2: 정규화 검사에서 현재 스캔 구간이 모두 탈락하면 다음 공개 레시피를 잃는다

- 확인: 반환 카드 수만 기준으로 `nextCursor`를 계산하면 원본 스캔 구간 뒤에 데이터가 있어도 `null`이 될 수 있었다.
- 수정: 반환 카드가 아니라 마지막 원본 스캔 행을 보존해 recent cursor를 진행시킨다. ranked cursor는 정렬 종류와 offset을 함께 검증한다.
- 런타임 증거: 다른 정렬의 cursor를 `recent` 요청에 사용했을 때 `400 INVALID_CURSOR`를 반환했다.
- 회귀 증거: `API v1 list advances past a scan window containing only incomplete rows`와 cursor 정렬 결합 테스트 통과.

### 가설 3: 운영 레이트 리밋 의존성이 없을 때 API가 우회하거나 내부 정보를 노출한다

- 확인: production `next start`를 `API_RATE_LIMIT_HMAC_SECRET` 없이 기동했다.
- 런타임 증거: 목록·상세·추천 세 경로 모두 `503 DEPENDENCY_NOT_READY`, `Retry-After`, `X-Request-Id`, `Cache-Control: no-store`를 반환했다. 응답에는 Supabase, secret 이름, stack, PostgreSQL 또는 service-role 문자열이 없었다.
- 추가 증거: 개발 경로에서 30회 한도를 넘긴 추천 요청은 `429 RATE_LIMITED`와 `Retry-After`를 반환했다.

## 전역 리뷰에서 수정한 추가 항목

- 계획서에 있는 목록 `sort`를 추가하고 다섯 정렬과 정렬 결합 cursor를 구현했다.
- 목록도 상세와 동일한 정규화 재료·단계·사용 관계·출처·안전 계약을 통과한 레시피만 노출하게 했다.
- 추천 최종 점수 전에 상위 50개만 잘리던 후보 폭을 출시 상한 200개로 넓혔다.
- 비운영 in-memory Map에 10,000개 전역 상한과 만료 정리를 추가했다.
- SQL 변수 `current_time`을 예약 키워드와 충돌하지 않는 `request_time`으로 변경했다.
- 검색 `_` 와 SQL wildcard 입력, 알 수 없는 추천 필드, 상충하는 제외 재료 필드를 거부한다.

## 결론

코드·HTTP 음성 경로·production fail-closed·빌드 검증은 통과했다. 실제 PostgreSQL RPC와 정상 200 응답은 migration history 및 staging 부재 때문에 아직 검증하지 않았으며, 이를 완료 상태로 간주하지 않는다.
