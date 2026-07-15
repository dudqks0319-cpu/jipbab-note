# Phase 6 모바일 접근성·LCP 검증 보고서

Updated: 2026-07-15 KST

## 2026-07-15 FE-017 핵심 접근성 보강

- 대상: 홈, 냉장고, 냉장고 재료 추가 모달, 레시피 목록, 장보기, 레시피 상세 조리 모드
- 결과: 코드로 검증 가능한 핵심 접근성 오류 0건. 실기기 VoiceOver/TalkBack과 OS 확대 동작은 별도 사람 증거로 남긴다.
- 폼 이름·오류: 검색, 일괄 입력, 재료명·수량·카테고리, 구매처·가격, 외부 레시피 가져오기, 댓글 입력에 명시적인 접근 가능한 이름을 부여했다. 보이는 냉장고 폼 라벨은 `htmlFor`와 `id`로 연결했고 레시피 가져오기·댓글 오류는 `aria-invalid`와 `aria-describedby`로 입력에 연결했다.
- 키보드: 링크·버튼·입력·select·textarea·tabindex 대상에 3px 고대비 `focus-visible` 표시를 추가했다. 냉장고 재료 추가 모달은 열릴 때 닫기 버튼으로 초점을 옮기고, Tab/Shift+Tab을 모달 안에서 순환시키며, Escape로 닫은 뒤 원래 버튼으로 초점을 돌려준다. 모달 중에는 main 스크롤을 잠근다.
- 상태·타이머: 냉장고 보기·보관 필터·카테고리·단위, 레시피 즐겨찾기·카테고리·빠른 필터, 장보기 카테고리·구매 상태에 `aria-pressed`를 추가해 색상만으로 상태를 전달하지 않는다. 조리 타이머는 기존의 보이는 `완료`, `role=timer`, assertive 안내, 소리·진동 미지원 시 화면 폴백, 21px 조리 본문 계약을 유지한다.
- 대비: 핵심 화면의 흐린 회갈색·주황·초록·파랑 텍스트와 주황 CTA 배경을 AA 대비 토큰으로 보정했다. 정적 기준값은 기본 본문 14.45:1, muted 5.75:1, secondary 6.12:1, 초록 secondary 6.14:1, accent 5.78:1, 주 CTA 5.18:1, 포커스 표시 5.27:1이다.

### 자동·브라우저 검증

- `pnpm check:phase6-accessibility`: 인터랙션 태그 236개, 정적 계약 17개, 실패 0개
- 전체 unit 474/474, TypeScript, lint 오류 0건, Next production build 40/40 경로, 통합 검사, 콘텐츠 176개·초보 안내 186개, Phase 1 계약 25/25, Phase 5 자동 감사 11/11 통과
- CDP runtime: 홈·냉장고·재료 추가 모달·레시피·장보기 5개 상태를 360/390/430px로 검사한 15개 조합 모두에서 44px 미달 0, 명시적 라벨 누락 0, 이름 없는 컨트롤 0, 계산 가능한 텍스트 대비 실패 0, 가로 overflow 0, 키보드 포커스 표시 확인
- 인앱 브라우저: 실제 냉장고 화면에서 검색 필드의 이름, 선택 버튼의 pressed 상태, 모달의 모든 폼 이름·그룹 이름을 접근성 트리로 확인했다. 모달 시작 초점, Shift+Tab/Tab 순환, Escape 종료·원래 버튼 복귀, main 스크롤 잠금이 동작했고 console error/warning은 0건이었다.
- 조리 모드 접근성 트리에서 21px 단계 본문, 진행률, 화면 유지 상태, `타이머 완료 · 2단계`, `2단계 타이머 완료`, 소리·진동 외 보이는 완료 문구를 확인했다.
- 로컬 캡처는 `output/ui-evidence/phase6-accessibility-{home,fridge,fridge-dialog,recipe,shopping}-{360,390,430}-cdp.png`에 있으며 생성 증거라 Git에는 추적하지 않는다.

### 보안·외부 경계

- 인증, 권한, API, DB, 의존성, lockfile은 변경하지 않았다. secret ignore, 추적된 secret 부재, `SECURITY DEFINER` 계약은 통과했다.
- 저장소 기본 pnpm audit는 폐기된 npm quick endpoint HTTP 410으로만 실패했다. 최신 pnpm bulk audit는 production dependency 108개에서 moderate/high/critical 0, 기존 low 1건이다.
- VoiceOver/TalkBack 실기기 탐색, 200% 이상 OS 확대·동적 글자 크기, 실제 iOS/Android 터치, staging/production DB, Production 승격, 스토어 제출은 이 증거로 완료 처리하지 않는다. Owner `ReleaseOperator`, due `before_store_candidate_signoff`.

## 2026-07-11 초기 KOREAN MOBILE UX RESULT

- Target: 홈과 공통 모바일 인터랙션 컨트롤
- Main Issue: 일부 36~40px 터치 타깃, 확대 차단, 건너뛰기 링크와 reduced-motion 대응 부재, 홈 핵심 이미지 LCP 우선순위 경고
- Changes: 44px 터치 타깃 하한, 사용자 확대 허용, 포커스 시 보이는 본문 건너뛰기 링크와 main landmark, reduced-motion CSS, 홈 핵심 이미지 eager/high fetch priority를 적용했다.
- Mobile Checks: 360px, 390px, 430px 모두 PASS. 각 너비에서 보이는 인터랙션 컨트롤 17개, 44px 미만 0개, 가로 overflow 0, 포커스된 skip link 44px를 확인했다.
- Remaining Risk: 홈 외 전체 라우트의 실기기 VoiceOver/TalkBack 검증과 production 배포는 아직 수행하지 않았다.

## 원인과 변경 범위

명시적으로 작은 아이콘 버튼과 링크가 여러 화면에 흩어져 있었고 공통 Button의 small 크기도 44px보다 작았다. `app/layout.tsx`는 사용자 확대를 막았고, 키보드 사용자가 반복 내비게이션을 건너뛸 수 있는 진입점이 없었다. 또한 같은 냉장고 이미지를 사용하는 홈의 세 렌더링 경로 중 일부에만 높은 로딩 우선순위를 주면 LCP 경고가 계속 남았다.

- 전역 버튼과 폼 컨트롤에 44px 하한을 적용하고, 공통 Button의 small 높이를 44px로 올렸다.
- 앱·커뮤니티·가족·냉장고·식단·마이페이지·레시피·설정·장보기 화면의 명시적 소형 컨트롤을 보정했다.
- viewport의 `maximumScale`과 `userScalable: false`를 제거했다.
- 포커스 시 나타나는 `본문으로 건너뛰기` 링크와 `main-content` landmark를 추가했다.
- `prefers-reduced-motion`에서 animation, transition, smooth scroll을 억제했다.
- `app/page.tsx`, `StarterActionCard`, `FridgeIllustration`의 above-fold 냉장고 이미지에 eager/high priority를 적용해 브라우저 LCP 경고를 제거했다.

DB, API, 인증 계약, 의존성은 변경하지 않았다.

## 자동 검증

- `pnpm check:phase6-accessibility`: 인터랙션 태그 214개, 계약 8개, 실패 0개
- `pnpm test`: lint와 TypeScript 통과, unit 368/368 통과. `scripts/upload-appstore-screenshots.mjs`의 기존 unused `createHash` 경고 1건은 유지된다.
- `pnpm build`: Next.js 16.2.6 production build와 38/38 routes 통과
- `pnpm release:check`: 12개 통과, Phase 5 사람 증거 0/20 한 항목만 의도대로 실패

## 실제 브라우저 검증

일반 headless Chrome의 macOS 최소 window width 때문에 최초 화면 폭 증거가 부정확했다. 최종 검증은 Chrome DevTools Protocol의 `Emulation.setDeviceMetricsOverride`로 정확한 viewport를 강제했다.

| Viewport | Visible controls | Under 44px | Document / viewport | Skip link |
| --- | ---: | ---: | --- | --- |
| 360px | 17 | 0 | 360 / 360 | focus 시 visible, 44px |
| 390px | 17 | 0 | 390 / 390 | focus 시 visible, 44px |
| 430px | 17 | 0 | 430 / 430 | focus 시 visible, 44px |

로컬 캡처는 `output/ui-evidence/phase6-accessibility-home-360-cdp.png`, `phase6-accessibility-home-390-cdp.png`, `phase6-accessibility-home-430-cdp.png`에 생성했으며 생성 산출물이므로 Git에는 추적하지 않는다. 세 화면 모두 가로 잘림이 없고 하단 내비게이션과 주요 CTA가 보이는 것을 확인했다.

## 디버깅 결론

1. 작은 타깃 문제는 공통 컴포넌트 하나가 아니라 명시적 크기를 가진 여러 컨트롤과 공통 Button에 함께 존재했다.
2. 운영체제 headless window 최소 폭은 모바일 반응형 증거로 신뢰할 수 없어 CDP device metrics가 필요했다.
3. LCP 경고는 동일 이미지를 사용하는 모든 above-fold 렌더링 경로에 힌트를 적용한 뒤에야 사라졌다.

## 보안·출시 상태

- 구현 커밋: `f9866d659804b2be04c29c46084b3085ba15bca8`
- GitHub 체크포인트: `ce855a6f7ba1396513bf9d2a258850a5f44e9a25`
- Vercel Preview: `dpl_2aCT3GhGL5s9Zb7B22AoJhxZgWkM`, `https://jipbab-note-chz9fy0f1-youngbeens-projects.vercel.app`, `READY`
- Preview 원격 build 38/38 routes, `/`와 `/recipe` HTTP 200, API v1의 예상된 redacted 503를 확인했다.
- Preview에서 CDP 360/390/430px 검증을 다시 실행해 44px 미만 컨트롤과 가로 overflow가 각각 0건임을 확인했다.
- 비밀값, 권한, 입력 검증, dependency lockfile 변경 없음
- Supabase migration은 적용하지 않았다.
- 현재 production alias는 이 변경을 포함하지 않으며 Preview를 production으로 승격하지 않았다.
- Phase 5 실제 조리·초보자·식품 안전·출처·이미지 권리 검수 0/20과 migration history 불일치는 계속 출시 차단 항목이다.
