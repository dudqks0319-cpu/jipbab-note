# Phase 6 모바일 접근성·LCP 검증 보고서

Updated: 2026-07-11 KST

## KOREAN MOBILE UX RESULT

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
