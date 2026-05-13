# 집밥노트

냉장고 속 재료를 관리하고, 보유 재료와 현재 상황에 맞춰 초보자도 따라 하기 쉬운 집밥 레시피를 추천하는 모바일 퍼스트 앱입니다.

## 주요 기능

- 냉장고 재료 등록/수정/삭제
- 유통기한 임박 재료 확인
- `10분 안에`, `재료 적게`, `실패 적게` 같은 상황별 레시피 추천
- 보유 재료 기반 레시피 매칭률 계산
- 레시피 검색, 즐겨찾기, 조리 완료 후 재료 차감
- 장보기 재료 바로 추가 및 외부 쇼핑 검색
- Supabase OAuth 로그인과 디바이스 데이터 이전
- 선택 기능: 커뮤니티 게시글/댓글/좋아요
- 브라우저 바코드 스캔 및 수동 바코드 조회

## 기술 스택

- Next.js App Router
- React, TypeScript
- Tailwind CSS
- Supabase
- Capacitor
- Vercel

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경변수

필수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY`는 계정 삭제 API에서만 사용하는 서버 전용 값입니다. 클라이언트 코드나 `NEXT_PUBLIC_` 환경변수로 노출하면 안 됩니다.

권장:

```bash
MFDS_API_KEY=
FOODSAFETY_API_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_KAKAO_JS_KEY=
NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS=google,kakao,apple
NEXT_PUBLIC_COMMUNITY_ENABLED=false
CAPACITOR_SERVER_URL=
```

`MFDS_API_KEY` 또는 `FOODSAFETY_API_KEY`가 없어도 재료 추천과 레시피 화면은 fallback 흐름으로 깨지지 않게 동작해야 합니다.

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 등록합니다.
3. `supabase/migrations`의 SQL을 순서대로 적용합니다.
4. RLS 정책이 활성화되어 있는지 확인합니다.
5. OAuth를 사용할 경우 Supabase Auth Provider와 Redirect URL을 별도로 설정합니다.

## 검증

```bash
pnpm test
pnpm build
pnpm test:mobile-flow
```

`pnpm test`는 ESLint와 TypeScript 검사를 실행합니다.
`pnpm test:mobile-flow`는 실행 중인 로컬 서버를 대상으로 홈, 레시피, 장보기 handoff, 바코드 fallback, API fallback을 확인합니다. 기본 대상은 `http://127.0.0.1:3001`이며 `BASE_URL`로 바꿀 수 있습니다.

## 웹 배포

Vercel에 프로젝트를 연결하고 로컬과 동일한 환경변수를 등록합니다. 운영 전 최소 확인 항목은 다음입니다.

- `pnpm build` 성공
- Supabase 마이그레이션 적용
- OAuth Redirect URL 등록
- `SUPABASE_SERVICE_ROLE_KEY`를 서버 환경변수로만 등록
- MFDS API 키가 없거나 실패해도 앱이 500으로 깨지지 않는지 확인

## 모바일 실행

현재 모바일 앱은 Capacitor 기반입니다. Next.js API Routes를 사용하므로 첫 출시 전략은 웹앱을 Vercel에 배포하고, Capacitor가 HTTPS URL을 여는 방식이 가장 단순합니다.

```bash
CAPACITOR_SERVER_URL=http://127.0.0.1:3000 pnpm exec cap sync ios
pnpm mobile:run:ios
pnpm mobile:run:android
```

TestFlight/실기기에서는 `CAPACITOR_SERVER_URL=https://배포된-웹앱-주소` 형태로 동기화해야 합니다.

## App Store/TestFlight 준비

- iOS 앱 표시명은 `집밥노트`로 설정되어 있습니다.
- 바코드 스캔용 `NSCameraUsageDescription`과 사진 첨부용 `NSPhotoLibraryUsageDescription`을 `ios/App/App/Info.plist`에 선언했습니다.
- 개인정보 처리방침 URL 후보: `/privacy`
- 지원 URL 후보: `/support`
- 이용약관 URL 후보: `/terms`
- 로그인 사용자는 마이페이지에서 계정 삭제를 시작할 수 있습니다. 운영 환경에서는 `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있어야 실제 인증 계정 삭제가 완료됩니다.
- App Store 제출 전에는 `NEXT_PUBLIC_COMMUNITY_ENABLED=false`를 권장합니다. 커뮤니티를 공개하려면 신고, 차단, 관리자 삭제, 스팸 제한 정책을 먼저 구현해야 합니다.

## 알려진 제한사항

- `x-device-id`는 익명 사용자 구분용이며 강한 인증 수단이 아닙니다.
- API rate limit은 현재 인메모리 기반이라 서버리스 멀티 인스턴스 환경에서는 보조 장치 수준입니다.
- 커뮤니티는 `NEXT_PUBLIC_COMMUNITY_ENABLED=true`일 때만 노출됩니다. 공개 운영하려면 신고, 관리자 삭제, 스팸 제한 정책이 추가로 필요합니다.
- 브라우저 바코드 스캔은 기기와 브라우저 지원 여부에 따라 수동 입력으로 대체될 수 있습니다.
- 앱스토어 출시 전에는 개인정보 처리방침, 이용약관, 네이티브 권한 안내, 심사용 문구를 별도로 준비해야 합니다.
