# 집밥노트 프로덕션 설정 메모

실서비스 배포 직전에 반드시 맞춰야 하는 외부 설정 요약입니다.

## 1. Supabase 프로젝트

1. 새 프로젝트를 만들고 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 발급합니다.
2. `supabase/migrations/*`를 순서대로 반영합니다.
3. `recipes`, `ingredients`, `favorites`, `shopping_items`, `community_*` 테이블이 생성됐는지 확인합니다.

## 2. OAuth 제공자

현재 앱은 `구글`, `애플` 로그인을 기본 간편 로그인으로 노출하고, `카카오`는 환경변수로 켤 수 있습니다.

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

Supabase OAuth provider 화면에는 provider별 Callback/Redirect URL을 외부 콘솔에 그대로 등록합니다.

- Supabase Redirect URL: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
- Google Cloud Authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
- Apple Services ID Return URL: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
- 앱 내부 콜백 URL: `https://<your-domain>/auth/callback`

배포 도메인이 바뀌면 Supabase URL Configuration과 Google/Apple 콘솔의 등록값을 함께 갱신합니다.

## 4. 운영 환경변수

최소:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `CAPACITOR_SERVER_URL` (모바일 앱이 연결할 공개 HTTPS 웹 주소)

권장:

- `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS=google,apple` (카카오까지 켤 경우 `google,apple,kakao`)
- `NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED=true`
- `NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED=true`
- `NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED=false` (카카오 운영 준비 전 기본값)
- `NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_DAIRY_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_FROZEN_URL`
- `NEXT_PUBLIC_COUPANG_PARTNERS_SEASONING_URL`
- `MFDS_API_KEY`

## 5. 쿠팡 파트너스

현재 앱은 다음 순서로 링크를 사용합니다.

1. 개별 재료 파트너스 딥링크 환경변수
2. 카테고리 대표 파트너스 링크
3. 없으면 쿠팡 검색 링크 fallback

즉, 배포 전에는 최소 감자/채소/계란 링크와 유제품/냉동식품/조미료 대표 링크를 실제 파트너스 링크로 교체하는 것이 좋습니다.

## 6. 앱스토어 제출 전

1. `/privacy` 공개 URL 준비
2. App Store Connect Privacy Policy URL 등록
3. App Privacy 답변 입력
4. `CAPACITOR_SERVER_URL=https://<public-app-url> npm run mobile:sync:ios` 로 iOS 설정 동기화
5. Xcode에서 `com.jipbab.note` 번들 ID, Signing Team, Provisioning Profile 확인
6. 실기기에서 카카오/구글/애플 로그인 확인
7. 실기기에서 바코드 카메라 스캔과 권한 거부/미지원 환경의 수동 입력 fallback 확인
8. 레시피 상세 → 장보기 → 구매 링크 이동 QA
9. 운영자 계정으로 `/admin/account-deletions` 접근 가능 여부 확인
10. `/account-delete` 요청 접수 후 운영자 화면에서 상태 변경 QA

## 7. 운영자 삭제 요청 처리

- 앱 사용자는 `/account-delete` 에서 삭제 요청을 접수합니다.
- 운영자는 로그인 후 `/admin/account-deletions` 에서 요청 목록을 확인하고 상태를 바꿉니다.
- 이 기능은 `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS` 가 반드시 설정되어야 동작합니다.

## 8. 소셜 로그인 운영 메모

- 앱스토어 심사 기준에 맞추려면 Google, Kakao 같은 서드파티 로그인을 쓸 경우 Apple 로그인도 동등한 옵션으로 제공합니다.
- Google 로그인은 최신 Google Identity Services 기준에서 WebView 지원이 제한되므로, 장기적으로는 네이티브 또는 외부 브라우저 기반 흐름을 검토해야 합니다.
- Kakao 로그인은 Kakao Developers의 리디렉트 URI 등록과 사용 설정이 완료되어야 합니다.

## 9. OAuth 출시 전 점검표

### 공통

- Supabase `Site URL`이 운영 도메인 `https://<your-domain>`으로 설정되어 있는지 확인
- Supabase `Redirect URLs`에 `https://<your-domain>/**`, `https://<your-domain>/auth/callback`, 필요한 Vercel preview 패턴이 등록되어 있는지 확인
- Google/Apple 콘솔에는 Supabase Redirect URL `https://<supabase-project-ref>.supabase.co/auth/v1/callback`만 등록하고, 앱 내부 `/auth/callback` URL을 잘못 등록하지 않았는지 확인
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 운영 배포 환경에 설정되어 있는지 확인
- OAuth 공개 플래그가 `true`/`false` 중 하나인지 확인. 잘못된 값은 앱에서 provider를 비활성화하고 설정 오류로 표시합니다.
- 배포 화면에서 Google/Apple 버튼이 먼저 보이고, 비활성 provider는 누락된 환경변수나 `false` 플래그명을 표시하는지 확인

### Google

- Google Cloud Console OAuth consent screen이 Production 상태인지 확인
- Web OAuth Client의 Authorized JavaScript origins에 `https://<your-domain>` 등록
- Web OAuth Client의 Authorized redirect URIs에 `https://<supabase-project-ref>.supabase.co/auth/v1/callback` 등록
- Supabase Google provider에 Client ID와 Client Secret 등록 후 Enabled 상태 확인
- 운영 도메인에서 Google 로그인 후 `/auth/callback`을 거쳐 `/mypage`로 이동하는지 확인

### Apple

- Apple Developer에서 Sign in with Apple capability가 App ID에 활성화되어 있는지 확인
- Services ID가 생성되어 있고 Primary App ID와 연결되어 있는지 확인
- Services ID Return URLs에 `https://<supabase-project-ref>.supabase.co/auth/v1/callback` 등록
- Supabase Apple provider에 Team ID, Services ID, Key ID, private key를 등록 후 Enabled 상태 확인
- Apple private key는 저장소, 문서, 로그에 남기지 않고 Supabase provider 설정에만 입력
- 운영 도메인에서 Apple 로그인 후 `/auth/callback`을 거쳐 `/mypage`로 이동하는지 확인
