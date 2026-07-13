# Phase 6 Release Candidate 통합 기록

- 작업일: 2026-07-14 KST
- 기준 SHA: `169e013b43d06124686f2121601a270d1e7df919`
- 브랜치: `integration/phase6-release-candidate`
- Production 승격: 금지

## 통합 원칙

- `ux/home-today-action-v2`, `agent/phase6-observability-analytics`, `agent/infant-toddler-recipe-research`, `feat/toddler-meals-content-v1-implementation-live`에는 긴급 수정 외 신규 기능을 추가하지 않는다.
- 기존 브랜치를 통째로 병합하지 않는다. 관측성 기준선 위에 E2E, UX, 분류 migration을 목적별로 수동 통합한다.
- 기술 fixture와 사람 검수 증거를 분리한다. 기술 E2E 성공은 실제 조리·초보자·식품 안전·권리 검수를 승인하지 않는다.
- 이유식·유아식 조사와 24~36개월 콘텐츠는 전문가·실조리·권리 검수 전까지 일반 사용자 경로에 노출하지 않는다.

## 포함

- integration/release 브랜치 GitHub Actions trigger
- integration·content·Production build·browser negative/happy·security 단계
- HttpOnly fixture session과 Production 404
- API v1 telemetry 보존 수동 병합
- Production-build happy path와 artifact redaction
- Starter·홈·레시피·장보기·조리 UX 보완
- 계란·두부 분류 migration과 fail-closed rollback
- 기존 33개 분석 계약에 연결되는 consent-gated runtime adapter

## 제외 및 외부 차단

- GitHub branch protection/required checks 설정은 원격 브랜치 push와 첫 Actions run 확인 후 저장소 관리자 권한으로 적용한다.
- Supabase remote history reconciliation, backup, staging/Production migration은 수행하지 않았다.
- Vercel Preview/Production과 Production alias는 변경하지 않았다.
- 사람 조리 20개, 전문가 검수, iOS/Android 실기기, Play internal track, 실제 alert receipt는 외부 증거 전까지 차단한다.

## 재현 명령

```bash
npm test
pnpm test:integration
pnpm test:content
pnpm check:phase6-e2e-contract
pnpm build
pnpm capture:phase6-e2e-negative
pnpm capture:phase6-e2e-happy
pnpm release:ci-static-check
pnpm release:security-check
pnpm release:goal-report
```

브라우저 실행은 로컬 포트 바인딩과 Chrome이 필요하다. 보안 감사는 package registry 네트워크 접근이 필요하다.
