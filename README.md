# 집밥노트

냉장고에 있는 재료를 고르면 초보자도 바로 따라 할 수 있는 오늘의 집밥을 추천하고, 부족 재료·장보기·조리·타이머·완료까지 이어주는 모바일 우선 앱입니다.

## 현재 출시 상태

- 내부 Preview QA: 가능
- 보호된 기술 fixture 기반 full happy path: 로컬/CI 실행 가능
- 핵심 20개 실제 조리·초보자·안전·출처·이미지 권리 검수: `0/20`
- 이유식·유아식 조사 후보: 앱 내 24개 탐색 가능, 실제 조리·의학·권리 검수와 공개 승인 `0/24`
- 공개 베타: 차단
- Production 승격: `NO-GO`

기술 fixture의 성공은 제품 데이터 또는 사람 검수 완료를 뜻하지 않습니다. 최신 원본과 배포 역할은 [공식 원본·배포 연결 기준](./docs/official-production-sources.md), 상세 차단 조건은 [현재 출시 상태](./docs/current-release-state.md)를 확인하세요.

## 핵심 흐름

1. 게스트가 냉장고 재료를 고르고 저장합니다.
2. publication gate를 통과한 레시피만 추천받습니다.
3. 상세에서 인분과 부족 재료를 확인합니다.
4. 부족 재료를 장보기에 추가하고 중복 수량을 합칩니다.
5. 단계별 조리와 타이머를 진행합니다.
6. 완료·피드백·재료 소진 상태를 기기에 저장합니다.

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Capacitor 준비 구조

## 환경변수

아래 값을 [`.env.example`](./.env.example)를 참고해 `.env.local`에 설정하세요. 비밀값은 저장소에 넣지 않습니다.

기본 앱:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `API_RATE_LIMIT_HMAC_SECRET` — 서버 전용
- `SUPABASE_SERVICE_ROLE_KEY` — 서버 전용

선택값:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `CAPACITOR_SERVER_URL`
- OAuth provider flags
- 재료별 쿠팡 파트너스 링크
- `MFDS_API_KEY`

Phase 6 기술 fixture:

- `APP_ENV=staging`
- `PHASE6_E2E_FIXTURE_ENABLED=true`
- `PHASE6_E2E_FIXTURE_TOKEN=<12자 이상의 서버 전용 임의값>`

fixture는 명시적 header와 token이 모두 필요하며 `APP_ENV=production` 또는 `VERCEL_ENV=production`에서는 항상 차단됩니다. 운영 환경에 fixture 변수를 활성화하지 마세요.

## 실행

```bash
pnpm install --frozen-lockfile
pnpm dev
```

기본 개발 서버는 `http://localhost:3000`입니다.

## 검증

```bash
npm test
pnpm test:integration
pnpm test:content
pnpm check:phase6-e2e-contract
pnpm capture:phase6-e2e-negative
pnpm capture:phase6-e2e-happy
pnpm release:ci-static-check
pnpm build
```

Chrome 자동 탐색이 실패하면 `CHROME_PATH`에 Chrome, Chrome for Testing 또는 Chromium 실행 파일을 지정하세요. E2E 증거는 `output/ui-evidence`에 생성되며 GitHub Actions artifact로 보존됩니다.

## 데이터와 보안 원칙

- 재료·장보기·즐겨찾기·조리 진행은 IndexedDB 기반 local-first로 즉시 저장합니다.
- 인증 사용자의 데이터는 pending sync queue를 거쳐 Supabase와 동기화합니다.
- 레시피의 공식 공개 경로는 `Frontend → API v1 → publication gate → recipe v2 → evidence check` 하나입니다.
- non-demo 화면에서 legacy recipe fallback이나 미승인 recipe를 노출하지 않습니다.
- API dependency가 준비되지 않으면 redacted `503`, `Retry-After`, `no-store`, request ID로 fail-closed 처리합니다.
- 기술 fixture는 Production에서 차단하고 실제 조리·사람 검수 통계에서 제외합니다.
- 파트너 링크는 정확한 재료 링크를 우선하며, 매핑이 없을 때 해당 재료명 검색으로 연결합니다. 넓은 카테고리 링크를 임의 대체하지 않습니다.

## 주요 경로

- 홈: `app/page.tsx`
- 냉장고: `app/fridge/page.tsx`
- 레시피 목록: `app/recipe/page.tsx`
- 레시피 상세·조리: `app/recipe/[id]/page.tsx`
- 이유식·유아식 조사 후보: `app/recipe/infant-toddler/page.tsx`
- 장보기: `app/shopping/page.tsx`
- API v1: `app/api/v1`
- 인증/계정: `hooks/useAuth.ts`, `app/mypage/page.tsx`
- E2E: `scripts/capture-phase-6-e2e-*.mjs`

## 다음 출시 게이트

1. DB 기반 staging recipe v2 fixture와 API v1 200 경로 검증
2. 실제 staging 계정의 로그인·guest merge·가족 공유·계정 삭제 성공 경로
3. migration history 대조, backup, staging 적용, rollback rehearsal
4. iOS·Android 실제 기기와 오프라인/백그라운드 타이머 검증
5. 핵심 레시피 20개 실제 조리와 사람 검수 20/20
6. 이유식·유아식 후보 24개 자체 계량·실제 조리·의학·권리·이미지 검수
7. P0/P1 0건 확인 후 별도 Production 승격 승인
