# 집밥노트

냉장고 속 재료를 관리하고, 보유 재료를 기준으로 레시피를 추천하며, 부족한 재료를 장보기로 이어주는 모바일 우선 집밥 도우미 앱입니다.

## 현재 베타 범위

- 실데이터 홈 대시보드
- 냉장고 재료 CRUD
- 유통기한 임박 재료 확인
- 레시피 검색 / 추천 / 상세
- 부족 재료 장보기 연동
- 로그인 전후 데이터 이전 기반

## 현재 베타 제외 범위

- 공개 커뮤니티를 핵심 경험으로 운영
- 고급 바코드 자동 입력
- 푸시 알림
- 앱스토어 출시 자동화

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Capacitor 준비 구조

## 필수 환경변수

아래 값은 [`.env.example`](./.env.example)를 복사해 `.env.local`로 설정하세요.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

선택값:

- `NEXT_PUBLIC_API_BASE_URL`
- `CAPACITOR_SERVER_URL`
- `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS`
- `NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED`
- `NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED`
- `NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED`
- `NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL`
- `MFDS_API_KEY`
- `FOODSAFETY_API_KEY`

## 실행

```bash
pnpm install
pnpm dev
```

- 기본 개발 서버: `http://localhost:3000`

## 검증 명령

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

모바일 셸에서 배포된 웹앱을 바로 로드하려면 `CAPACITOR_SERVER_URL=https://your-app-domain` 값을 사용하세요.

## 핵심 사용자 흐름

1. 냉장고에 재료를 등록합니다.
2. 홈에서 임박 재료와 추천 레시피를 확인합니다.
3. 레시피 상세에서 부족 재료를 확인합니다.
4. 부족 재료를 장보기 목록으로 넘깁니다.
5. 로그인 시 데이터를 계정 기준으로 이어서 관리합니다.

## 주요 경로

- 홈: `app/page.tsx`
- 냉장고: `app/fridge/page.tsx`
- 레시피 목록: `app/recipe/page.tsx`
- 레시피 상세: `app/recipe/[id]/page.tsx`
- 장보기: `app/shopping/page.tsx`
- 인증/계정: `hooks/useAuth.ts`, `app/mypage/page.tsx`
- 설정/정책: `app/settings/page.tsx`, `app/privacy/page.tsx`, `app/support/page.tsx`

## 데이터/백엔드 메모

- 재료, 즐겨찾기, 계정 전환은 Supabase 구조를 기준으로 설계되어 있습니다.
- 일부 UX는 베타 안정성을 위해 로컬 저장 기반 보조 상태를 사용합니다.
- 레시피는 Supabase 저장 데이터 우선, 없으면 MFDS API를 fallback으로 사용합니다.
- 장보기에는 쿠팡 파트너스 딥링크를 연결할 수 있고, 값이 없으면 쿠팡 검색 링크로 fallback 됩니다.
- OAuth 로그인은 `/auth/callback` 경로에서 세션 교환을 수행합니다.

## 다음 우선순위

1. Supabase 실제 프로젝트 연결 및 소셜 로그인 키 입력
2. 쿠팡 파트너스 실링크 교체
3. 앱스토어 개인정보/스크린샷/실기기 QA
4. 테스트/CI 강화
