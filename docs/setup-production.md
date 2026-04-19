# 집밥노트 프로덕션 설정 메모

실서비스 배포 직전에 반드시 맞춰야 하는 외부 설정 요약입니다.

## 1. Supabase 프로젝트

1. 새 프로젝트를 만들고 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 발급합니다.
2. `supabase/migrations/*`를 순서대로 반영합니다.
3. `recipes`, `ingredients`, `favorites`, `shopping_items`, `community_*` 테이블이 생성됐는지 확인합니다.

## 2. OAuth 제공자

현재 앱은 `카카오`, `구글`, `애플` 로그인을 UI와 코드 레벨에서 지원합니다.

- 카카오: Supabase Kakao provider + Kakao Developers REST API key / client secret 필요
- 구글: Supabase Google provider + Google Cloud OAuth client 필요
- 애플: Supabase Apple provider + Apple Developer Team ID / Services ID / secret key 필요

공식 문서:

- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Kakao: https://supabase.com/docs/guides/auth/social-login/auth-kakao
- Supabase Google: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Apple: https://supabase.com/docs/guides/auth/social-login/auth-apple

## 3. 리디렉트 URL

Supabase Auth URL Configuration에 아래를 등록합니다.

- `http://localhost:3000/**`
- 실제 배포 도메인 `https://<your-domain>/**`
- Vercel preview를 쓸 경우 `https://*-<team-or-account-slug>.vercel.app/**`

OAuth 코드는 `/auth/callback` 경로에서 세션으로 교환합니다.

## 4. 운영 환경변수

최소:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `CAPACITOR_SERVER_URL` (모바일 앱이 연결할 공개 HTTPS 웹 주소)

권장:

- `NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL`
- `MFDS_API_KEY`

## 5. 쿠팡 파트너스

현재 앱은 다음 순서로 링크를 사용합니다.

1. 개별 파트너스 딥링크 환경변수
2. 없으면 쿠팡 검색 링크 fallback

즉, 배포 전에는 최소 감자/채소/계란 링크부터 실제 파트너스 링크로 교체하는 것이 좋습니다.

## 6. 앱스토어 제출 전

1. `/privacy` 공개 URL 준비
2. App Store Connect Privacy Policy URL 등록
3. App Privacy 답변 입력
4. `CAPACITOR_SERVER_URL=https://<public-app-url> npm run mobile:sync:ios` 로 iOS 설정 동기화
5. Xcode에서 `com.jipbab.note` 번들 ID, Signing Team, Provisioning Profile 확인
6. 실기기에서 카카오/구글/애플 로그인 확인
7. 레시피 상세 → 장보기 → 구매 링크 이동 QA
