# 집밥노트 프로덕션 설정 메모

실서비스 배포 직전에 반드시 맞춰야 하는 외부 설정 요약입니다.

## 1. Supabase 프로젝트

1. 새 프로젝트를 만들고 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 발급합니다.
2. `supabase/migrations/*`를 순서대로 반영합니다.
3. `recipes`, `ingredients`, `favorites`, `shopping_items`, `community_*` 테이블이 생성됐는지 확인합니다.
4. Free-tier pause 메일을 받았거나 `pnpm check:supabase-live`가 `ENOTFOUND`로 실패하면 Supabase Dashboard에서 프로젝트를 Resume/Restore 한 뒤 다시 확인합니다.
5. 제출 전에는 `pnpm release:full-check`로 로컬 게이트와 운영 Supabase REST 확인을 같이 통과시킵니다.

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
- `ANDROID_UPLOAD_KEYSTORE_PATH`
- `ANDROID_UPLOAD_KEYSTORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_KEY_PASSWORD`

권장:

- `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS=google,apple,kakao`
- `NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED=true`
- `NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED=true`
- `NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED=true` (Kakao Developers와 Supabase Kakao provider 설정 완료 후 운영)
- `NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL` (선택, DB 장애 시 fallback)
- `NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL` (선택, DB 장애 시 fallback)
- `NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL` (선택, DB 장애 시 fallback)
- `NEXT_PUBLIC_COUPANG_PARTNERS_DAIRY_URL` (선택, DB 장애 시 fallback)
- `NEXT_PUBLIC_COUPANG_PARTNERS_FROZEN_URL` (선택, DB 장애 시 fallback)
- `NEXT_PUBLIC_COUPANG_PARTNERS_SEASONING_URL` (선택, DB 장애 시 fallback)
- `NEXT_PUBLIC_COUPANG_PARTNERS_ITEM_LINKS_JSON` (선택, DB 장애 시 fallback)
- `MFDS_API_KEY`

## 5. 쿠팡 파트너스

현재 앱은 다음 순서로 링크를 사용합니다.

1. Supabase `partner_links` 테이블의 개별 재료 링크
2. Supabase `partner_links` 테이블의 카테고리 대표 링크
3. 환경변수 fallback 링크
4. 없으면 쿠팡 검색 링크 fallback

즉, 배포 전에는 `supabase/migrations/20260508133307_add_partner_links.sql`을 운영 Supabase에 적용하고 `partner_links` 테이블에서 링크를 관리합니다. 환경변수 링크는 DB가 비어 있거나 조회 실패할 때만 쓰는 보조 수단입니다.

개별 재료 링크는 DB에 `upsert`로 하나씩 추가합니다.

```sql
insert into public.partner_links (kind, name, normalized_key, url, display_order, memo)
values
  ('item', '계란', '계란', 'https://link.coupang.com/a/your-egg-link', 10, '검색결과 공유 파트너스 링크')
on conflict (kind, normalized_key) do update
set url = excluded.url, active = true, display_order = excluded.display_order, memo = excluded.memo;
```

재료명이 정확히 일치하면 DB 개별 링크가 가장 먼저 쓰이고, 없으면 DB 카테고리 링크, 환경변수 fallback, 쿠팡 검색 링크 순서로 이동합니다. 실제 수익 링크는 쿠팡 파트너스 계정에서 발급한 링크만 사용합니다.

운영 보안 기준:

- `partner_links`는 `active = true` 행만 공개 읽기 가능하고, `anon`/`authenticated` 쓰기는 허용하지 않습니다.
- 링크 변경은 Supabase SQL editor, migration, 또는 service-role이 보호된 운영자 도구에서만 수행합니다.
- 운영자 도구를 만들 경우 관리자 이메일 allowlist와 서버 측 service-role 사용을 분리하고, 변경 이력을 남깁니다.
- `partner_links` 조회 실패는 사용자에게 오류를 띄우지 않고 앱 내 검증된 정적/환경변수 fallback으로 이어집니다. 운영자는 console warning과 링크 점검 스크립트로 상태를 확인합니다.

## 6. 앱스토어 제출 전

1. `/privacy` 공개 URL 준비
2. App Store Connect Privacy Policy URL 등록
3. App Privacy 답변 입력
4. `CAPACITOR_SERVER_URL=https://<public-app-url> npm run mobile:sync:ios` 로 iOS 설정 동기화
5. Xcode에서 `com.jipbab.note` 번들 ID, Signing Team, Provisioning Profile 확인
6. 현재 코드로 새 archive/export를 만들고, archive build number가 `ios/App/App.xcodeproj`의 `CURRENT_PROJECT_VERSION`과 일치하는지 확인
7. `pnpm check:ios-release` 또는 `pnpm release:check` 실행
8. archive 경로가 기본값과 다르면 `IOS_ARCHIVE_PATH=/path/to/App.xcarchive pnpm check:ios-release`로 확인
9. IPA 경로가 기본값과 다르면 `IOS_IPA_PATH=/path/to/App.ipa pnpm check:ios-release`로 확인
10. 실기기에서 카카오/구글/애플 로그인 확인
11. 실기기에서 유통기한 로컬 알림 권한 허용/거부와 D-3/D-1/당일 예약 확인
12. 레시피 상세 → 장보기 → 구매 링크 이동 QA
13. 운영자 계정으로 `/admin/account-deletions` 접근 가능 여부 확인
14. `/account-delete` 요청 접수 후 운영자 화면에서 상태 변경 QA

## 6-1. Play Store 제출 전

1. Google Play Console에서 Play App Signing을 활성화하고 upload key 전략을 확정합니다.
2. 기존 upload key가 없다면 `pnpm android:upload-key:create`로 후보 키를 생성합니다.
3. 생성된 `.release-secrets/android-upload.jks`와 `.env.android-signing.local`은 git에서 제외되지만, Play Console에 쓰기로 결정했다면 반드시 별도 보관합니다. 이 파일을 잃으면 같은 upload key로 업데이트를 올릴 수 없습니다.
4. 기존 upload key가 있다면 `.env.android-signing.local`에 `ANDROID_UPLOAD_KEYSTORE_PATH`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`를 넣고 keystore 파일은 git 밖에 보관합니다.
5. `pnpm android:bundle-release`를 실행합니다.
6. `pnpm check:android-release` 또는 `jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab`에서 unsigned가 아닌 서명 검증 결과를 확인합니다.
6. Android emulator smoke에서 흰 화면이 나오면 원격 WebView URL DNS 문제를 먼저 확인합니다.
7. DNS가 실패하면 `emulator -avd Medium_Phone_API_36.1 -no-snapshot -no-audio -no-boot-anim -dns-server 8.8.8.8,1.1.1.1`로 재부팅한 뒤 앱을 다시 실행합니다.

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
