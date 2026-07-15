# Phase 6 모바일 성능 예산 보고서

Updated: 2026-07-15 KST

## FE-018 반응형 이미지 최적화

- 로컬 레시피·냉장고·장보기·웰컴 이미지는 `next/image`의 반응형 `sizes`와 WebP 출력을 사용한다. 상단 레시피·웰컴 이미지는 preload하고 나머지는 lazy load한다. 로컬 SVG는 변환하지 않고, 임의 외부 사용자 URL은 원격 도메인을 전역 허용하지 않은 채 원본 경로와 실패 fallback을 유지한다.
- 레시피 이미지는 저해상도 blur placeholder를 거쳐 표시하며 첫 URL이 실패하면 검증된 로컬 fallback으로 교체한다. fallback까지 실패하면 기존 박스 크기를 유지한 한국어 대체 상태를 표시해 레이아웃 이동을 막는다.
- 성능 캡처는 홈·웰컴·냉장고·즐겨찾기 이미지 실패·레시피 목록 검색·장보기 6개 화면을 3회씩 측정한다. 이미지별 최적화 요청 수, 원본 로컬 raster 우회, 단일 이미지 전송량을 별도 검사한다. 즐겨찾기 실패 경로는 임시 Chrome 프로필에만 합성 항목을 넣고 누락 이미지를 로컬 fallback으로 복원하며 80x80 영역과 CLS를 검증한다.
- 로컬 production build에서 390x844, CPU 4x, 1.6Mbps/150ms RTT, cold run 3회 기준 LCP p75는 홈 792ms, 웰컴 472ms, 냉장고 432ms, 이미지 실패 복구 444ms, 레시피 목록 432ms, 장보기 504ms다. CLS p75는 전 화면 0, 상호작용 p75 24ms, 검색 입력 반영 p75 16.5ms다.
- 최적화 이미지 최소 요청 수는 홈 1, 웰컴 1, 냉장고 10, 이미지 실패 복구 2, 장보기 30이다. 원본 로컬 PNG·JPEG·WebP 직접 요청 0건, 가장 큰 최적화 이미지 15,018B, console error 0건, unexpected network error 0건이다. 의도한 이미지 실패는 별도로 분류했고 fallback 카드 크기와 대체 이미지 복구가 3/3회 통과했다.
- 이 측정은 동일 기기의 production-like 로컬 lab guard이며 실제 사용자 field p75나 Vercel Preview 측정이 아니다. Production field p75와 보호된 Preview 원격 재측정은 별도 증거로 유지한다.

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
- Production alias는 위 차단 항목이 남아 있어 Preview로 승격하지 않았다.
