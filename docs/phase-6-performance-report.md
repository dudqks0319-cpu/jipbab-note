# Phase 6 모바일 성능 예산 보고서

Updated: 2026-07-13 KST

## 결과

- 성능 게이트 구현 커밋: `1c2d353237220153aa943dbbc76dad1cfc9ea7fd`
- iOS 동기화 회귀 수정 커밋: `d25691a594cb02a832ee502f17c687d23a1250e9`
- Vercel Preview deployment: `dpl_CXQDf9vKvvo5YGAxvMarSNjMt8H4`
- Preview URL: `https://jipbab-note-3wkvam4y5-youngbeens-projects.vercel.app`
- 배포 상태: `READY`
- Production 승격: 하지 않음

계획서의 모바일 기준인 LCP 2.5초 이하, CLS 0.1 이하, 상호작용 200ms 이하, 검색 입력 반영 100ms 이하를 재현 가능한 lab 환경에서 모두 통과했다. 이 결과는 field p75가 아니라 회귀 방지용 lab guard다. Vercel Speed Insights에는 아직 충분한 field data가 없으므로 production field p75는 미검증으로 유지한다.

## 측정 조건

- Chrome DevTools Protocol
- viewport `390x844`
- CPU slowdown `4x`
- download `1.6 Mbps`, upload `750 Kbps`, RTT `150ms`
- cold navigation 3회씩 측정 후 p75 계산
- 게스트 홈 `/`, 데모 레시피 목록, 데모 장보기 화면 측정
- PerformanceObserver로 LCP, CLS, Event Timing, long task 수집
- CDP trusted key input으로 검색 입력 반영 시간 측정

## Preview 측정값

| 화면 | LCP p75 | CLS p75 | FCP p75 | TTFB p75 | transfer p75 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 게스트 홈 | 1,240ms | 0 | 1,240ms | 201.5ms | 394,222B |
| 데모 레시피 목록 | 876ms | 0 | 876ms | 146.5ms | 518,711B |
| 데모 장보기 | 1,736ms | 0.0412 | 1,736ms | 674.2ms | 273,868B |

- 상호작용 p75: `40ms`
- 검색 입력 반영 p75: `34.1ms`
- 앱 console error: `0`
- unexpected network error: `0`
- 게스트 홈의 API dependency 503: 3회, 현재 migration/HMAC secret 미적용에 따른 예상된 fail-closed 응답
- Vercel Preview feedback script CSP 차단: 화면별 3회, 앱 오류가 아닌 예상된 플랫폼 이벤트
- 성능 예산 실패: `0`

로컬 증거는 `output/performance-evidence/phase6-performance-lab.json`에 저장되며 Git에는 포함하지 않는다. 반복 실행은 다음과 같다.

```bash
PHASE6_PERFORMANCE_URL=<preview-url> pnpm capture:phase6-performance
pnpm check:phase6-performance
```

회귀 기준은 `docs/phase-6-performance-baseline.json`에 고정한다. 2026-07-13 증거에 전체 transfer만 있어 해당 값에는 +15% 예산을 즉시 적용한다. JS·이미지·요청 수·long task 기준은 다음 승인된 populated-data 측정에서 값을 채울 때까지 `missingBaselines`로 명시하며, 값이 없는 기준을 통과로 가장하지 않는다. TTFB 800ms, hydration 오류 0, console 오류 0, unexpected network 오류 0은 절대 예산으로 항상 검사한다.

실제 출시 후보 데이터 측정은 공개 승인된 레시피 UUID와 제목을 지정해야 한다. 이 프로필은 공개 레시피 홈, 카드 12개 목록, 이미지 상세와 인분 변경, 장보기 20개, 조리 모드, 실행 중 타이머, 가족 냉장고, 로그인 callback, 앱 정보 화면을 모두 검사한다. 화면 데이터나 회귀 baseline이 비어 있으면 실패한다.

```bash
PHASE6_PERFORMANCE_URL=<preview-url> \
PHASE6_PERFORMANCE_PROFILE=release-candidate \
PHASE6_PERFORMANCE_RECIPE_ID=<published-recipe-uuid> \
PHASE6_PERFORMANCE_RECIPE_TITLE=<published-recipe-title> \
PHASE6_PERFORMANCE_DEPLOYMENT_SHA=<40-character-preview-git-sha> \
PHASE6_PERFORMANCE_RUNS=5 \
pnpm capture:phase6-performance
```

Release Candidate는 화면마다 cold 5회와 warm 5회를 별도로 측정한다. 각 모드의 median, p75, 최대값, 표준편차, 실패율을 기록하고 절대 예산과 회귀 예산은 보수적인 cold p75에 적용한다. 최초 측정은 아직 기준선이 없으므로 절대 성능·runtime 검사를 통과해도 회귀 기준 누락으로 실패하며, Git에서 제외된 증거 JSON은 남긴다. 증거 전체를 사람이 검토한 뒤 실패가 기준선 누락뿐일 때만 다음 명령으로 집계값을 승격한다. 승격기는 명시적 승인, 전체 배포 SHA, cold/warm 각 5회, 9개 필수 화면, 절대 성능 예산, runtime·capture 오류 0건을 다시 검사하며 raw 측정값이나 실패 목록은 baseline에 복사하지 않는다.

```bash
PHASE6_PERFORMANCE_PROMOTION_APPROVED=1 \
pnpm promote:phase6-performance-baseline
```

승격 후 같은 배포·데이터로 `pnpm capture:phase6-performance`를 다시 실행해 새 기준선 대비 회귀 검사까지 통과해야 한다. 출시 후보 완료 판정에는 측정 성공만으로 부족하며, 다음 항목을 모두 기록해야 `pnpm release:candidate-gate`가 통과한다.

- `measurementProfile`: `release-candidate`
- `deploymentSha`: 측정한 Preview의 40자리 Git SHA
- `runCount`: 화면별 총 10회 이상
- `runCountPerCacheMode`: cold·warm 각각 5회 이상
- `totalRunCountPerRoute`: `runCountPerCacheMode × 2`
- `interactionP75Milliseconds`, `searchInputP75Milliseconds`
- 9개 화면별 `totalTransferBytes`, `jsTransferBytes`, `imageTransferBytes`, `requestCount`, `totalLongTaskMilliseconds`, `longTaskOver50Count`
- 9개 화면의 cold·warm별 `median`, `p75`, `max`, `standardDeviation`, `failureRate`

필수 화면은 `published-home`, `published-recipe-list-12`, `image-recipe-detail-serving`, `shopping-list-20`, `cooking-mode`, `timer-running`, `family-fridge`, `login-callback`, `app-info`다. 현재 baseline은 데모 3개 화면의 이전 측정값만 포함하므로 출시 후보 성능 증거는 `BLOCKED`다.

## 연계 검증

- Phase 6 성능 정적 계약: 11/11
- 새 Preview 브라우저 음성 E2E: 12/12
- 깨끗한 checkout에서 iOS sync 후 lint, TypeScript, unit: 372/372
- CI-safe release gate: 15/15
- release security gate: 4/4, production dependency moderate 이상 알려진 취약점 0건
- 원격 Vercel build: compile, TypeScript, 38/38 routes
- Preview HTTP: `/` 200, `/recipe` 200
- API v1: 예상된 redacted 503, `Cache-Control: no-store`, `Retry-After: 60`, `X-Request-Id` 확인
- 최근 Vercel error log: 0
- 최근 Vercel fatal log: 0
- release harness: 구조 실패 0, 미해결 P0 차단으로 `ATTENTION`

깨끗한 checkout 검증 과정에서 `scripts/sync-capacitor.mjs`가 생성하는 iOS 플러그인 목록이 현재 OAuth 계약과 달라지는 회귀를 발견했다. `CAPBrowserPlugin`, `JipbabOAuthPlugin`, `CapApp_SPM.JipbabOAuthPlugin`을 동기화 후 다시 등록하도록 수정했고 OAuth 집중 테스트 26/26과 전체 unit 372/372로 확인했다.

## 미완료와 잔여 위험

- Owner `ProductAnalytics`, due `before_production_performance_signoff`: 실제 사용자의 LCP/CLS/INP field p75가 아직 없다.
- Owner `ContentQA+BeginnerTesters+FoodSafety+Legal`, due `before_any_phase5_recipe_publication`: 실제 조리와 사람 검수 증거가 0/20이다.
- Owner `FullStackDev+DBA`, due `before_any_supabase_db_push`: migration history, backup, rollback drill, 검수된 staging v2 fixture가 준비되지 않았다.
- Owner `FullStackDev+QA`, due `before_phase6_completion`: 공개 승인 레시피가 없어 추천 성공부터 조리 완료까지 full happy-path E2E를 실행할 수 없다.
- Owner `FullStackDev+SRE`, due `before_phase6_completion`: 현재 Git-linked Preview가 Vercel 인증으로 보호되어 populated release-candidate 성능 측정을 실행할 수 없다. 승인된 automation bypass 또는 측정 가능한 Preview가 필요하다.
- Production alias는 위 차단 항목이 남아 있어 Preview로 승격하지 않았다.
