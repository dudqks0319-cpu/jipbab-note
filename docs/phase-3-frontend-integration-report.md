# Phase 3 프런트엔드 API v1 전환 보고서

작성일: 2026-07-11 KST

## 결과

- 홈과 레시피 목록은 legacy `/api/recipes`, 로컬 레시피 캐시, curated fallback 대신 publication-gated API v1을 사용한다.
- 홈 추천 요청은 현재 냉장고 재료를 정확한 ingredient catalog ID로 변환해 API v1 정렬에 전달한다.
- 목록은 API v1의 `recommended`, `least-missing`, `fastest` 정렬과 시간·부족 재료 필터를 사용하고, cursor는 정렬 조건이 바뀌면 초기화한다.
- 검색어, 정규 카테고리, 빠른 필터, 난이도, 시간, 도구, 냉장고, 정렬, 즐겨찾기, 상세 필터 열림 상태를 URL에서 복원하고 `history.replaceState`로 유지한다.
- 카테고리 레일을 Phase 1의 15개 정규 카테고리로 전환했다. `초보가능`과 `10분요리`만 가상 필터로 남겼다.
- 상세 화면은 API v1 정규 재료, 수량, 손질, 대체재, 단계별 불 세기·시간·시각 단서·안전·복구 팁, 보관·재가열, 출처만 표시한다.
- 계약에 없는 기본 음식 사진, 임의 조리 시간, 임의 인분, 일반 계량법, 일반 실패 복구 문장, 일반 완성 판정, 외부 영상 검색 카드를 제거했다.

## 오류와 빈 상태

- 목록의 429, 503, 일반 실패 문구는 내부 오류를 노출하지 않는 한국어 메시지로 분리했다.
- URL 상태를 복원하기 전 API 호출을 막고, 검색 debounce가 완료된 뒤 한 번만 요청한다.
- 503 안내와 재시도 버튼을 검색창 바로 아래 `role=alert` 영역에 배치했다.
- 상세 dependency 실패, 미존재 ID, 발행 게이트 실패는 동일한 안전한 공개 불가 화면으로 닫힌다.
- 현재 production migration과 rate-limit secret이 미적용이므로 로컬 production 서버의 정상 결과는 의도한 `503 DEPENDENCY_NOT_READY`다. API 본문은 내부 DB 오류나 환경변수를 노출하지 않는다.

## 검증

- `pnpm test`: 339/339 통과. 기존 `upload-appstore-screenshots.mjs` unused import 경고 1건만 남아 있다.
- `pnpm build`: 성공, 38개 정적 페이지와 API v1 목록·상세·추천 및 동적 상세 경로 생성.
- `pnpm cloudflare:build`: 성공, `.open-next/worker.js` bundle 생성.
- `pnpm release:ci-static-check`: 12/12 통과. `pnpm release:check`: 11/11 통과. `pnpm release:security-check`: 통과.
- API v1 상세 모델 테스트는 수량, 대체재 비율, 불 세기, 시간, 복구 팁, 안전 문구, 출처 매핑을 확인한다.
- production HTTP: 검색·시간·정렬 요청은 redacted 503, `Retry-After: 60`, `Cache-Control: no-store`, `X-Request-Id`를 반환했다.
- Playwright 접근성 스냅샷: 360px에서 검색어 `계란`, 시간 `10분 이하`, 정렬 `빠른 순`, 15개 정규 카테고리, 첫 화면 503 alert와 재시도 버튼을 확인했다.
- 정확한 CSS viewport 캡처: 360/390/430 모두 `innerWidth`가 요청 폭과 일치했고 `q=계란`, `sort=time`, 오류·재시도 문구가 보였다.
- 상세 390px 캡처: 안전한 공개 불가 설명과 목록 복귀 버튼을 확인했다.

## 증거

- `output/ui-evidence/phase3-recipe-360.png`
- `output/ui-evidence/phase3-recipe-390.png`
- `output/ui-evidence/phase3-recipe-430.png`
- `output/ui-evidence/phase3-detail-unavailable-390.png`
- `docs/phase-3-debug-audit.md`

## 보안 게이트

1. Secrets: 새 비밀이나 하드코딩된 자격 증명을 추가하지 않았다.
2. AuthN/AuthZ: UI는 공개 API v1만 소비하고 service-role 또는 임의 device identity를 브라우저에 전달하지 않는다.
3. 입력·출력: 검색·필터·정렬은 API v1 경계에서 검증되며 URL 값은 allowlist로 복원한다. 원시 runtime 오류는 사용자에게 표시하지 않는다.
4. Dependencies: 새 의존성 없음.
5. 민감정보: 오류 UI와 증거에 secret, token, email, DB 오류를 기록하지 않았다.
6. Abuse controls: 429/Retry-After와 production 503 fail-closed 동작을 유지한다.
7. 음성 경로: 503, 발행 불가 상세, 빈 결과, 잘못된 URL 상태, stale local fallback 부재를 테스트했다.
8. 잔여 위험: staging/production migration, HMAC secret, 검수 완료 v2 fixture와 정상 200 브라우저 경로는 외부 준비 전까지 차단 상태다.

## 남은 외부 작업

- `P0 / FullStackDev+DBA / Phase 3 정상 경로 검증 전`: remote migration history를 조정하고 백업 가능한 격리 staging에 Phase 0~2 migration을 순서대로 적용한다.
- `P0 / Content QA / Phase 3 정상 경로 검증 전`: 발행 증거와 정규 데이터가 완전한 v2 fixture를 검수·승인한다.
- `P0 / Platform+Security / API 공개 전`: `API_RATE_LIMIT_HMAC_SECRET`을 secret store에 등록하고 200/429/503 복구를 확인한다.
- `P0 / FullStackDev+QA / 배포 전`: 실제 staging 데이터로 홈 추천, 목록 pagination, 상세, 장보기의 정상 200 경로를 360/390/430에서 다시 검증한다.

DB migration, secret 등록, production 배포, recipe 승인 또는 외부 상태 변경은 수행하지 않았다.
