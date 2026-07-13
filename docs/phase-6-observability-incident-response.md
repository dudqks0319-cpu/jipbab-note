# Phase 6 분석 검증·장애 대응

Updated: 2026-07-13 KST

## 현재 판정

- 운영 API 텔레메트리 계약: 로컬 구현·검증
- 제품 분석 이벤트 계약: 로컬 구현·검증
- 제품 분석 전송: 기본 비활성
- 외부 분석 벤더: 미선정
- 외부 경보 채널: 미연결
- 실제 사용자 field 지표: 미수집
- production 배포·롤백 연습: 미실행

외부 벤더, 사용자 동의 문구, 보관기간과 삭제 정책이 승인되기 전에는 제품 분석 이벤트를 전송하지 않는다. 현재 구현은 `enabled: true`, `consent: granted`, 명시적 transport가 동시에 제공될 때만 전송 경계를 연다.

## 운영 API 텔레메트리

API v1의 목록, 상세, 추천 응답은 요청당 한 번 `api.request_completed` 이벤트를 구조화 로그로 남긴다.

허용 필드:

- `request_id`
- `endpoint`
- `status`
- `latency_ms`
- `error_code`
- `deployment_sha`

금지 필드:

- 인증 토큰, 쿠키, 세션 원문
- 이메일, 전화번호, 초대 코드
- 전체 URL과 query string
- 검색어, 요청 body, 레시피 자유 입력
- service role key와 외부 API secret

`deployment_sha`는 `VERCEL_GIT_COMMIT_SHA`, `DEPLOYMENT_SHA`, `GITHUB_SHA` 중 검증된 7~64자리 hex 값만 사용하고 없으면 `unknown`을 기록한다. sink 장애는 API 응답을 실패시키지 않는다. `DEPENDENCY_NOT_READY`는 현재 migration/HMAC 의존성 차단을 구분할 수 있도록 warning으로 기록하며, 다른 5xx는 error로 기록한다.

## 제품 분석 이벤트 계약

계획서 18.1의 33개 이벤트를 `lib/analytics/product-events.ts`에 고정했다. 모든 이벤트는 다음 공통 속성만 사용한다.

- 가명 `anonymous_session_id`
- `user_status`
- allowlist `screen`
- `app_version`
- `platform`
- `deployment_sha`
- 선택적 `recipe_id`, `recipe_version`, `experiment_id`

이벤트별 추가 값은 재료 수, 결과 수, 단계 번호, 타이머 초, 경과 초, allowlist filter ID와 allowlist failure code뿐이다. 이메일, 전화번호, URL, 검색어, 실패 사유 자유 문장과 알 수 없는 속성은 거부한다.

## 운영 대시보드 계약

외부 모니터링을 연결할 때 다음 집계를 deployment SHA와 endpoint별로 분리한다.

- 요청 수와 4xx·5xx 비율
- p50·p95 latency
- `INTERNAL_ERROR`, `DEPENDENCY_NOT_READY`, `RATE_LIMITED` 비율
- 최신 배포 SHA와 직전 정상 SHA
- 제품 분석이 승인된 이후 첫 재료 등록률, 첫 추천 확인률, 레시피 상세 진입률, 조리 시작률, 조리 완료율
- 레시피별 조리 시작·완료·중단 단계·구조화 failure code

## 경보 임계치

| 등급 | 조건 | 최소 표본 | 초기 대응 |
| --- | --- | ---: | --- |
| P0 | 인증 우회, 다른 사용자 데이터 노출, 계정 삭제 오작동, secret 노출 | 1건 | 즉시 쓰기 차단 또는 이전 배포 롤백 |
| P0 | `INTERNAL_ERROR` 비율 10% 이상이 5분 지속 | 50 requests | 배포 중지, 직전 정상 SHA 확인, 롤백 판단 |
| P1 | 5xx 비율 3% 이상이 15분 지속 | 100 requests | endpoint·SHA별 분리 후 담당자 호출 |
| P1 | API p95 latency 2,000ms 초과가 15분 지속 | 100 requests | DB·외부 의존성·cold start 분리 |
| P1 | `DEPENDENCY_NOT_READY` 비율 20% 이상이 15분 지속 | 100 requests | migration, secret, rate-limit RPC 상태 확인 |
| P1 | 권한 거부가 최근 7일 동일 시간대 기준 3배 이상 | 100 requests | abuse와 배포 회귀를 분리하고 auth 로그 검토 |

표본 미만은 대시보드 warning으로만 표시한다. 임계치 변경은 실제 트래픽 기준선과 false-positive 기록을 남긴 뒤 승인한다.

## 장애 대응 절차

1. `request_id`, endpoint, status, error code, latency, deployment SHA만 공유 채널에 기록한다.
2. Vercel deployment와 GitHub commit이 같은지 확인한다.
3. 영향 범위를 공개 읽기, 인증, 가족 공유, 계정 삭제, 조리 흐름으로 나눈다.
4. P0 보안 사고는 관련 쓰기 경로를 deny-by-default로 차단하고 자격증명 노출 여부를 확인한다.
5. 앱 코드 회귀면 직전 정상 deployment ID를 확인한 뒤 운영자 승인으로 `vercel rollback <deployment-id> --yes`를 실행한다.
6. DB 사고는 migration history와 restorable backup을 확인하기 전 임의 down migration을 실행하지 않는다. 기존 fail-closed rollback SQL만 staging 복원 시험 뒤 사용한다.
7. 롤백 후 `/`, `/recipe`, API v1의 성공·음성 경로, 인증 거부, error/fatal 로그를 다시 확인한다.
8. 원인, 영향 시간, 탐지 경로, 복구 SHA, 재발 방지 담당자와 기한을 incident 기록에 남긴다.

## 운영 스모크

```bash
pnpm check:phase6-observability
pnpm release:ci-static-check
pnpm release:security-check
curl -I <preview-url>/
curl -I <preview-url>/recipe
curl -i '<preview-url>/api/v1/recipes?limit=1'
vercel logs <deployment-url> --no-follow --since 30m --level error --json
vercel logs <deployment-url> --no-follow --since 30m --level fatal --json
```

로그를 공유할 때 request body, query string, 계정 정보와 환경변수 값은 포함하지 않는다.

## 남은 외부 게이트

- Owner `Product+Privacy`, due `before_product_analytics_enablement`: 동의 문구, 개인정보 처리방침, 보관기간, 삭제·opt-out 정책 승인
- Owner `FullStackDev+SRE`, due `before_production_monitoring_signoff`: 모니터링 벤더와 경보 채널 연결, 테스트 경보 수신 증거
- Owner `FullStackDev+DBA`, due `before_any_supabase_db_push`: migration history 조정, restorable backup, staging rollback 연습
- Owner `FullStackDev+QA`, due `before_phase6_completion`: production smoke와 실제 롤백 연습 증거
