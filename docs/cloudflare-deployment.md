# Cloudflare Deployment

집밥노트의 Cloudflare 후보 배포 경로입니다. Vercel 운영 경로를 삭제하지 않고, 쿠팡파트너스 등 상업적 링크 운영을 검토하기 위한 별도 배포면으로 둡니다.

## 구조

- Runtime: Cloudflare Workers
- Adapter: `@opennextjs/cloudflare`
- CLI: `wrangler`
- Worker name: `jipbab-note-app`
- Worker entry: `.open-next/worker.js`
- Static assets binding: `ASSETS`
- Static assets routing: `run_worker_first = true`
- Capacitor bootstrap shell: `capacitor-shell/`, not `public/`, so Cloudflare/Next root assets cannot serve the mobile loader at `/`
- Incremental cache: first candidate uses dummy cache, so R2/KV를 필수로 요구하지 않습니다.

## 명령

```bash
pnpm check:cloudflare-config
pnpm preview
pnpm deploy
pnpm cf-typegen
pnpm check:cloudflare-live-home
pnpm cloudflare:build
pnpm cloudflare:preview
pnpm cloudflare:deploy
```

`preview`/`deploy`는 OpenNext Cloudflare 표준 명령 alias이고, 기존 `cloudflare:*` 명령은 릴리즈 게이트 호환용으로 유지합니다. `deploy`와 `cloudflare:deploy`는 Cloudflare 계정 로그인과 프로젝트 권한이 필요합니다. 배포 전 `wrangler login` 또는 Cloudflare API token 설정을 완료합니다.

`check:cloudflare-live-home`은 `/`가 단순 HTTP 200이어도 Capacitor bootstrap loader 문구인 `집밥노트 불러오는 중` 또는 `원격 앱 연결을 확인하는 중입니다`를 반환하면 실패합니다. Cloudflare 전환 완료 판단은 실제 Next 앱 shell markers가 보일 때만 합니다.

## 환경변수

Cloudflare Dashboard 또는 `wrangler secret put`으로 운영 값을 설정합니다. 값을 저장소, 문서, 로그에 쓰지 않습니다.
아래 이름은 운영 필수값입니다. 단, 현재 Cloudflare 후보는 루트 라우팅 수정 배포를 먼저 가능하게 하려고 `wrangler.jsonc`의 `secrets.required`를 아직 켜지 않습니다. `secrets.required`를 먼저 켜면 실제 secret 등록 전 `wrangler deploy`가 실패합니다. Cloudflare Dashboard에 값이 등록된 뒤에만 `secrets.required`를 켭니다.

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

Workers 후보 도메인을 모바일 QA에 사용할 때는 `capacitor.config.ts`의 app-only `allowNavigation`에 `jipbab-note-app.dudqks0319.workers.dev`가 포함되어 있어야 합니다. Google/Apple/Kakao provider host는 계속 WebView allowNavigation에 넣지 않습니다.

그 뒤 iOS/Android 실기기에서 Google/Apple/Kakao 로그인 완료, 알림 권한/예약, 장보기 링크, 계정삭제 요청을 다시 확인합니다.

## 쿠팡파트너스 고지

호스팅을 Cloudflare로 바꿔도 쿠팡파트너스와 표시광고 고지는 별도 의무입니다. 집밥노트는 외부 스크립트, iframe, 배너 삽입에 의존하지 않고 부족 재료 장보기 흐름 안에서 `상품 추천 카드 + 제휴 링크 버튼 + 제휴 안내 문구`로만 노출합니다.

- 앱 안에서 제휴/수수료 고지를 사용자가 구매 CTA 전에 볼 수 있게 둡니다.
- 쿠팡파트너스에 등록한 채널/도메인에서만 파트너스 링크를 사용합니다.
- 제휴 링크 URL은 `link.coupang.com` allowlist와 앱의 partner-link 검증을 통과해야 합니다.
- 제휴 링크 버튼은 `rel="sponsored noopener noreferrer"`를 사용합니다.
- 검증된 파트너스 링크가 없으면 카드 자체를 숨기고, 검색 링크나 광고 스크립트로 대체하지 않습니다.

## 레시피 이미지 운영

초기 출시 후보는 정적 이미지 경로를 사용합니다. 이미지는 직접 촬영 또는 직접 생성한 이미지로만 넣고, 유명 캐릭터, 로고, 브랜드명, 외부 썸네일, 자막을 사용하지 않습니다.

```txt
public/images/recipes/{recipeId}/cover.webp
public/images/recipes/{recipeId}/ingredients.webp
public/images/recipes/{recipeId}/tools.webp
public/images/recipes/{recipeId}/knowhow-01.webp
public/images/recipes/{recipeId}/step-01.webp
public/images/recipes/{recipeId}/step-02.webp
public/images/recipes/{recipeId}/fail-01.webp
public/images/recipes/{recipeId}/final.webp
```

레시피 단계 데이터에는 `imageUrl`, `imageAlt`, `imageCaption`, `beginnerTip`, `visualCue`를 함께 기록합니다. 이미지가 아직 없는 단계는 상세 화면에서 `사진 준비중` 플레이스홀더로 표시해 모바일 레이아웃이 깨지지 않게 합니다. 레시피가 50개 이상으로 늘어나면 같은 경로 규칙을 유지하면서 Cloudflare R2 또는 Cloudflare Images로 이관합니다.

## 검증 순서

1. `pnpm check:cloudflare-config`
2. `pnpm exec tsc --noEmit`
3. `pnpm lint`
4. `pnpm test:unit`
5. `pnpm validate:recipes`
6. `pnpm build`
7. `pnpm cloudflare:build`
8. `pnpm preview`
9. preview URL에서 `/`와 `/api/recipes` HTTP 200 확인
10. Cloudflare 배포 후 `PRODUCTION_APP_URL=https://<cloudflare-domain> pnpm check:cloudflare-live-home`
11. Cloudflare 배포 후 `CHECK_VERCEL_PRODUCTION_ENV=0 PRODUCTION_APP_URL=https://<cloudflare-domain> pnpm check:production-family-route`
12. Cloudflare 배포 후 `PRODUCTION_APP_URL=https://<cloudflare-domain> pnpm check:production-account-deletion-route`
13. Cloudflare/Supabase OAuth callback 등록 후 `NEXT_PUBLIC_SITE_URL=https://<cloudflare-domain> CAPACITOR_SERVER_URL=https://<cloudflare-domain> pnpm check:oauth-live`
14. Cloudflare 운영 전용 묶음 검증은 `pnpm release:cloudflare-external-check`로 실행합니다. 이 명령은 `scripts/check-cloudflare-external-release.mjs`를 통해 Vercel env 확인을 건너뛰고 Cloudflare URL을 기준으로 home/API/live Supabase read-write-RLS/OAuth/production route smoke를 확인합니다.

## Capacitor Shell 분리

`public/index.html`과 `public/runtime-app-config.json`은 Cloudflare/Next public assets와 충돌하므로 사용하지 않습니다. Capacitor bootstrap shell은 아래 경로로 분리했습니다.

```txt
capacitor-shell/index.html
capacitor-shell/runtime-app-config.json
capacitor.config.ts webDir = "capacitor-shell"
```

`assets.run_worker_first = true`와 `check:cloudflare-live-home`은 전환 안전장치로 계속 유지합니다.
