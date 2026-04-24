# 집밥노트

냉장고 재료 관리, 레시피 추천, 장보기, 가족 냉장고, 커뮤니티 공유를 제공하는 Next.js + Capacitor 앱입니다.

## Getting Started

개발 서버 실행:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API 설정

`.env.example`을 참고해 로컬/배포 환경변수를 설정합니다.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 로그인, 냉장고, 커뮤니티 데이터 저장
- `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS`: 노출할 OAuth 제공자 목록, 예: `google,kakao,apple`
- `NEXT_PUBLIC_KAKAO_JS_KEY`: 카카오톡 레시피 공유용 Kakao JavaScript SDK 키
- `MFDS_API_KEY` 또는 `FOODSAFETY_API_KEY`: 식약처 레시피/재료 API 키
- `NEXT_PUBLIC_API_BASE_URL`: 네이티브 WebView에서 API 서버를 별도 도메인으로 호출할 때 사용
- `CAPACITOR_SERVER_URL`: iOS WebView가 연결할 웹앱 주소. 시뮬레이터는 로컬 주소를, TestFlight/실기기는 배포된 HTTPS 주소를 사용합니다.

Supabase 콘솔에서는 Google, Kakao, Apple OAuth Provider와 Redirect URL을 별도로 등록해야 합니다. 카카오 공유는 Kakao Developers에서 JavaScript 키와 Web 플랫폼 도메인을 등록해야 동작합니다.

## iOS 빌드

개발 서버를 WebView로 연결해 시뮬레이터에서 확인:

```bash
CAPACITOR_SERVER_URL=http://127.0.0.1:3000 pnpm exec cap sync ios
```

TestFlight 업로드는 Apple Developer Team, iOS Distribution 인증서, provisioning profile, App Store Connect 인증 정보가 필요합니다.
실기기/TestFlight 빌드 전에는 `CAPACITOR_SERVER_URL=https://배포된-웹앱-주소` 형태로 동기화해야 iPhone에서 실제 앱 화면이 열립니다.

## Verification

```bash
pnpm test
pnpm build
```
