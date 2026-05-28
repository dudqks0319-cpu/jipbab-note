# Cloudflare Deployment

집밥노트의 Cloudflare 후보 배포 경로입니다. Vercel 운영 경로를 삭제하지 않고, 쿠팡파트너스 등 상업적 링크 운영을 검토하기 위한 별도 배포면으로 둡니다.

## 구조

- Runtime: Cloudflare Workers
- Adapter: `@opennextjs/cloudflare`
- CLI: `wrangler`
- Worker name: `jipbab-note-app`
- Worker entry: `.open-next/worker.js`
- Static assets binding: `ASSETS`
- Incremental cache: first candidate uses dummy cache, so R2/KV를 필수로 요구하지 않습니다.

## 명령

```bash
pnpm check:cloudflare-config
pnpm cloudflare:build
pnpm cloudflare:preview
pnpm cloudflare:deploy
```

`cloudflare:deploy`는 Cloudflare 계정 로그인과 프로젝트 권한이 필요합니다. 배포 전 `wrangler login` 또는 Cloudflare API token 설정을 완료합니다.

## 환경변수

Cloudflare Dashboard 또는 `wrangler secret put`으로 운영 값을 설정합니다. 값을 저장소, 문서, 로그에 쓰지 않습니다.

필수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS`
- `NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED`
- `NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED`
- `NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_SITE_URL`
- `CAPACITOR_SERVER_URL`
- `PRODUCTION_APP_URL`

Cloudflare 도메인을 확정하면 `NEXT_PUBLIC_SITE_URL`, `CAPACITOR_SERVER_URL`, `PRODUCTION_APP_URL`은 같은 HTTPS origin으로 맞춥니다.

## OAuth 콜백

Cloudflare 배포 URL이 정해지면 Supabase Auth URL Configuration에 아래를 추가합니다.

- `https://<cloudflare-domain>/**`
- `https://<cloudflare-domain>/auth/callback`
- `com.jipbab.note://auth/callback`

Google/Apple/Kakao 외부 콘솔에는 계속 Supabase provider callback만 등록합니다.

- `https://<supabase-project-ref>.supabase.co/auth/v1/callback`

앱 WebView에는 Google/Apple/Kakao provider host를 넣지 않습니다. iOS/Android OAuth는 시스템 브라우저를 열고 `com.jipbab.note://auth/callback`으로 돌아옵니다.

## 모바일 앱 전환

Cloudflare 후보 도메인을 모바일 앱이 보게 하려면 배포 확인 후 아래처럼 동기화합니다.

```bash
CAPACITOR_SERVER_URL=https://<cloudflare-domain> pnpm mobile:sync:ios
CAPACITOR_SERVER_URL=https://<cloudflare-domain> pnpm mobile:sync:android
```

그 뒤 iOS/Android 실기기에서 Google/Apple/Kakao 로그인 완료, 알림 권한/예약, 장보기 링크, 계정삭제 요청을 다시 확인합니다.

## 쿠팡파트너스 고지

호스팅을 Cloudflare로 바꿔도 쿠팡파트너스와 표시광고 고지는 별도 의무입니다.

- 앱 안에서 제휴/수수료 고지를 사용자가 구매 CTA 전에 볼 수 있게 둡니다.
- 쿠팡파트너스에 등록한 채널/도메인에서만 파트너스 링크를 사용합니다.
- 제휴 링크 URL은 `link.coupang.com` allowlist와 앱의 partner-link 검증을 통과해야 합니다.

## 검증 순서

1. `pnpm check:cloudflare-config`
2. `pnpm exec tsc --noEmit`
3. `pnpm lint`
4. `pnpm test:unit`
5. `pnpm cloudflare:build`
6. Cloudflare 배포 후 `PRODUCTION_APP_URL=https://<cloudflare-domain> pnpm check:production-family-route`
7. Cloudflare 배포 후 `PRODUCTION_APP_URL=https://<cloudflare-domain> pnpm check:production-account-deletion-route`
8. Cloudflare/Supabase OAuth callback 등록 후 `NEXT_PUBLIC_SITE_URL=https://<cloudflare-domain> CAPACITOR_SERVER_URL=https://<cloudflare-domain> pnpm check:oauth-live`
