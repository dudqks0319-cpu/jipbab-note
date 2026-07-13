# Phase 6 기술 E2E fixture 운영 기준

Updated: 2026-07-11 KST

## 목적

추천 → 상세 → 인분 변경 → 장보기 → 중복 수량 병합 → 조리 → 타이머 → 완료 → 재료 소진 → 피드백 경로를 실제 Chrome에서 자동 검증합니다.

이 fixture는 애플리케이션 계층의 격리된 기술 데이터입니다. DB 기반 staging recipe v2, 실제 조리, 초보자 검수, 식품 안전 검수, 출처 법무 검수 또는 이미지 권리 검수의 대체 증거가 아닙니다.

## 활성화 조건

다음 조건을 모두 만족할 때만 응답합니다.

1. `APP_ENV=staging` 또는 테스트 런타임
2. `PHASE6_E2E_FIXTURE_ENABLED=true`
3. 12자 이상인 `PHASE6_E2E_FIXTURE_TOKEN`
4. 요청 header `x-phase6-e2e-fixture`가 token과 일치
5. `APP_ENV`와 `VERCEL_ENV`가 모두 Production이 아님

Production으로 판별되면 다른 조건과 관계없이 fail-closed 처리합니다. token은 서버 전용이며 `NEXT_PUBLIC_*` 변수로 만들거나 로그에 기록하지 않습니다.

## 데이터 경계

- 고정 UUID namespace: `00000000-0000-4000-8000-0000000006xx`
- 고정 recipe ID: `00000000-0000-4000-8000-0000000006e1`
- `isTestFixture=true`
- 이미지 없음 승인 상태
- 실제 DB row 생성 없음
- 실제 사람 검수 CSV와 release 통계에서 제외
- 공개 Production 목록과 추천에서 노출 금지

fixture publication evidence는 API/UI publication gate를 통과시키기 위한 기술 계약값입니다. `reviewedForBeginner`, `actualCookingTested` 같은 fixture 내부 값은 사람 증거로 집계하지 않으며 E2E 결과에도 `humanReviewCounted=false`를 기록합니다.

## 실행

로컬 실행은 runner가 격리된 Next 서버와 임시 token을 준비합니다.

```bash
pnpm capture:phase6-e2e-happy
```

외부 staging Preview를 검증할 때만 URL과 server token을 명시합니다.

```bash
PHASE6_E2E_URL=https://staging.example.com \
PHASE6_E2E_FIXTURE_TOKEN=replace-with-server-token \
pnpm capture:phase6-e2e-happy
```

필요하면 `CHROME_PATH`로 Chrome 실행 파일을 지정합니다.

## 증거

- `phase6-e2e-mobile-390.png`
- `phase6-e2e-desktop-1280.png`
- `phase6-network-log.json`
- `phase6-console-log.json`
- `phase6-e2e-result.json`
- `phase6-accessibility-summary.json`

PR artifact는 14일, 수동 release candidate 실행 artifact는 90일 보존합니다.

## 아직 필요한 staging 증거

- 실제 staging DB/schema의 recipe v2 fixture
- source ledger·ingredient·step·publication evidence FK 연결
- API v1 목록·추천·상세 200
- distributed rate limit RPC
- cleanup script와 전용 fixture 계정
- migration staging 적용과 rollback rehearsal

위 항목이 완료되기 전에는 “DB 기반 full happy path 완료” 또는 “출시 준비 완료”로 표시하지 않습니다.
