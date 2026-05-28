# 집밥노트 실기기 QA 증거

Updated: 2026-05-28 13:35 KST

이 문서는 App Store / Play Store 제출 전 실제 기기 QA 완료 여부를 기록합니다.
`pnpm check:real-device-qa-evidence`는 아래 confirmation 문자열이 모두 채워지기 전까지 실패합니다.
각 플랫폼별 evidence date와 evidence artifacts도 실제 날짜와 스크린샷/로그/녹화 경로 또는 URL로 채워야 통과합니다.
기기 연결 전후에는 `pnpm release:capture-external-evidence`로 `output/release-evidence/<timestamp>/summary.md`와 원시 진단 파일을 먼저 남깁니다.
실기기 QA를 실행할 때는 `pnpm release:capture-real-device-qa`로 기기 상태, 설치 여부, native artifact inventory, `device-unblock-checklist.md`, `operator-checklist.md`, `manual-qa-template.md`를 함께 캡처합니다. App Store만 먼저 진행할 때는 `pnpm release:capture-ios-real-device-qa`로 iOS-only packet을 만들고, Play Store만 먼저 진행할 때는 `pnpm release:capture-android-real-device-qa`로 Android-only packet을 만듭니다. 이 패킷은 증거 수집용이며, 실제 체크를 보지 않은 상태에서 `confirmed`로 바꾸면 안 됩니다.

## Current Status

- iOS real-device QA: not confirmed
- Android real-device QA: not confirmed
- Latest iOS device check: App Store production/Supabase blockers are cleared, and the production family/account-deletion route smoke checks pass when run standalone. `xcrun devicectl list devices` reports `영빈` iPhone 16 Pro as `available (paired)`, and `xcrun xctrace list devices` now shows it as `(Connecting)` in this environment. `pnpm check:real-device-availability -- --platform=ios` passes. The latest installed Debug build includes the native OAuth URL scheme and Capacitor Browser/App plugins, and `devicectl device process launch` succeeds. Treat all iPhone QA evidence below as partial until the manual checklist in this doc is completed on the physical device.
- Latest Android device check: the Mac USB bus sees `SAMSUNG_Android`, but direct Android SDK `adb devices -l` is still empty and `pnpm check:real-device-availability -- --platform=android` fails with `Android physical device: none attached`. Treat this as a phone-side USB debugging / USB mode / authorization blocker, not as completed Android QA.

## Unblock Checklist

### iOS device

- Unlock iPhone `[redacted-device]` and keep the screen awake during QA.
- Confirm the iPhone trusts this Mac if the trust prompt appears.
- Confirm Developer Mode is enabled on the iPhone.
- Reconnect the cable or use a data-capable cable if CoreDevice still shows `unavailable`.
- Rerun `xcrun devicectl list devices` and continue only when the state is available.

### Android device

- Connect a physical Android device over USB.
- Enable Developer options and USB debugging on the device.
- Revoke USB debugging authorizations, reconnect the cable, choose File transfer / MTP from the USB notification, and temporarily disable Samsung Auto Blocker if the RSA debugging prompt does not appear.
- Accept the RSA debugging prompt if it appears.
- Rerun `adb devices -l` and continue only when a physical device appears as `device`, not `unauthorized` or empty.

## Required Confirmation Strings

아래 항목은 실제 기기에서 확인한 뒤 `confirmed`로 바꿉니다. 로그/스크린샷/녹화 경로는 같은 섹션에 함께 남깁니다.

### iOS

- iOS real-device QA: not confirmed
- Device: iPhone
- iOS build: 2026052001
- Bundle ID: com.jipbab.note
- iOS core loop: confirmed
- iOS Google login: not confirmed
- iOS Apple login: not confirmed
- iOS Kakao login: not confirmed
- iOS local notification permission and scheduling: not confirmed
- iOS shopping external link: confirmed
- iOS account deletion request: not confirmed
- iOS raw error disclosure: not observed
- iOS evidence date: 2026-05-28
- iOS evidence artifacts: /Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-28T00-45-ios-manual-qa

### Android

- Android real-device QA: not confirmed
- Device: not confirmed
- Android package: com.jipbab.note
- Android core loop: not confirmed
- Android Google login: not confirmed
- Android Kakao login: not confirmed
- Android Apple login/provider behavior: not confirmed
- Android local notification permission and scheduling: not confirmed
- Android shopping external link: not confirmed
- Android account deletion request: not confirmed
- Android back navigation: not confirmed
- Android raw error disclosure: not checked
- Android evidence date: pending
- Android evidence artifacts: pending

## Evidence Log

- 2026-05-28 13:35 KST: iPhone Google login showed Google `403 disallowed_useragent`, confirming that provider login must not run inside the embedded WebView. Native OAuth was changed to open provider login through Capacitor Browser and return through `com.jipbab.note://auth/callback`; `server.allowNavigation` now excludes Google/Apple/Kakao provider hosts. iOS URL scheme, Android intent filter, Capacitor sync, Vercel Production deploy, iPhone Debug build, physical install, and physical launch all passed. `pnpm check:oauth-live` passed 10 checks, including Google/Apple/Kakao native OAuth redirects. A built app plist check confirms `com.jipbab.note` URL scheme. iPhone Mirroring is currently locked behind the Mac login password, so final Google/Apple/Kakao account authorization, notification permission/scheduling, and logged-in account deletion request are still not marked confirmed. Evidence: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-28T13-35-ios-native-oauth-deeplink-fix/summary.md`.
- 2026-05-28 12:40 KST: OAuth/PKCE WebView 세션 이어받기 1차 수정 후 Production 배포와 새 iOS Debug 설치를 완료했습니다. 이후 Google `disallowed_useragent` 재현으로 해당 방식은 폐기했고, 13:35 KST의 시스템 브라우저 + 앱 딥링크 방식으로 대체했습니다. 이 증거는 빌드/설치 이력으로만 보관하며 최종 OAuth 완료 증거로 사용하지 않습니다. 증거: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-28T12-40-ios-oauth-pkce-fix/summary.md`.
- 2026-05-28 12:08 KST: iPhone Mirroring으로 설치된 `com.jipbab.note` build `2026052001`을 직접 조작했습니다. 확인 완료: 냉장고 화면 렌더링, 재료 추가(`egg` 저장), 홈 추천 갱신, 추천 레시피 상세 진입, 부족 재료 장보기 추가, 장보기 목록 렌더링, `link.coupang.com` 외부 링크 Safari 이동, 로그인 화면의 Google/Apple/Kakao 버튼 표시, raw stack trace/secret/provider internal 미노출. 증거: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-28T00-45-ios-manual-qa/summary.md` 및 `screenshots/*.png`. 블로커: Google OAuth는 `jipbab-note-app.vercel.app` 복구 화면으로 돌아와 “로그인을 완료하지 못했습니다”가 표시되어 로그인 완료로 볼 수 없습니다. Apple/Kakao 로그인 완료, 로컬 알림 예약, 로그인 후 계정삭제 요청은 아직 미확인입니다.
- 2026-05-28 18:37 KST: `pnpm release:capture-ios-real-device-qa`를 권한 실행으로 다시 캡처해 `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-28T00-36-34-990Z-real-device-qa-ios` 패킷을 생성했습니다. 패킷은 통과 항목(real-device-availability/devicectl/xctrace) 3개와 native-artifacts/체크리스트 템플릿을 포함합니다. 수동 확인(코어루프/OAuth 3종/알림/쇼핑 링크/계정삭제)은 아직 `docs/real-device-qa.md`에 `confirmed`로 반영되지 않았습니다.
- 2026-05-28 08:52 KST: Rechecked after the iPhone cable was connected. Live Supabase, Storage, OAuth, Vercel Production env, and App Store Connect/TestFlight checks pass under sandbox-escalated `pnpm release:appstore-external-status`; the production account-deletion route smoke passes standalone with 3/3 checks, and the production family route smoke passes standalone with 4/4 checks including cleanup. The iPhone is currently not usable for release QA: `xcrun devicectl list devices` shows `영빈` iPhone 16 Pro as `unavailable`, `xcrun xctrace list devices` lists it under `Devices Offline`, and USB inspection does not show an attached iPhone identity. Do not mark iOS real-device QA confirmed until the iPhone is unlocked/trusted, CoreDevice reports it as available, and the full OAuth, notification, shopping-link, account-deletion, and raw-error checks are observed on-device.

- 2026-05-28 07:36 KST: After applying the production Supabase Storage/family-scope/RLS-recursion SQL bundle, `pnpm release:supabase-live-unblock-check` passed with live Supabase REST/RLS 29/29 and Storage path policy 2/2. `pnpm release:appstore-external-status` then narrowed App Store blockers to iOS only: `Passed: 7`, `Blocked: 2`. `pnpm release:appstore-submit-gate` returned `Passed: 8`, `Blocked: 1`. Current device diagnostics still block submission: `xcrun devicectl list devices` shows `영빈` iPhone 16 Pro as `unavailable`, and `xcrun xctrace list devices` lists the same iPhone under `Devices Offline`. Do not submit to App Store review until the iPhone is available and the full iOS real-device QA evidence is captured.
- 2026-05-28 09:26 KST: 실기기 게이트를 재확인해 `xcrun devicectl list devices`에서 `영빈` iPhone 16 Pro( iPhone17,1 )가 `available (paired)`로 잡혔고, `pnpm check:real-device-availability -- --platform=ios`를 통과했습니다. `com.jipbab.note`는 `xcrun devicectl device info apps`에서 `Version 1.0`, `Build 2026052001`로 확인되며, `xcrun devicectl device process launch`로 실행 성공했습니다.
  `pnpm release:capture-ios-real-device-qa`로 `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-28T00-26-38-981Z-real-device-qa-ios` 패킷을 새로 생성했습니다 (실기기 패킷: `Passed 3`, `Blocked 0`).
  현재 블로커는 `pnpm check:real-device-qa-evidence -- --platform=ios`에서 `iOS real-device QA evidence` 미기록으로 남아 있으며, 아래 수동 체크 항목(코어루프/OAuth/알림/링크/계정삭제/raw-error)만 실기기에서 직접 완료하면 해소됩니다.

- 2026-05-27 13:58 KST: Rechecked the operator-connected Samsung Android phone. `ioreg -p IOUSB` shows `SAMSUNG_Android@00200000`, proving USB hardware-level attachment, but `/Users/jyb-m3max/Library/Android/sdk/platform-tools/adb devices -l` prints only `List of devices attached` with no rows. `pnpm check:real-device-availability -- --platform=android` still fails with `Android physical device: none attached`. Do not mark Android real-device QA confirmed until the phone appears in ADB as `device` and the manual OAuth, notification, shopping-link, account-deletion, back-navigation, and raw-error checks are executed on the physical device.
- 2026-05-26 09:18 KST: Continued the remaining iPhone QA through iPhone Mirroring. The app login screen opened on the physical iPhone and the Google OAuth button was pressed without entering or requesting user credentials. The flow returned to the production callback surface, but the app showed the controlled recovery copy `로그인을 완료하지 못했습니다` and did not establish an authenticated `/mypage` session. Evidence was saved to `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-26T00-15-11Z-ios-auth-attempts`. Do not mark Google/Apple/Kakao login, logged-in account deletion, or full iOS QA confirmed. Current `pnpm check:real-device-availability -- --platform=ios` still fails because CoreDevice reports the iPhone as `unavailable`.
- 2026-05-26 09:06 KST: iPhone Mirroring was unlocked by the operator and used to open the installed physical-iPhone app. Partial QA screenshots were saved to `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-25T23-56-09Z-ios-mirroring-qa`: fridge list, recipe list, recipe detail, shopping list, Coupang external-link handoff, logged-out mypage, and notification settings. Confirmed partial checks: app renders on physical iPhone, recipe detail opens from the recipe list, shopping external link opens Safari at `link.coupang.com`, and no raw stack trace/env/provider error was visible in the inspected screens. Not confirmed: Google/Apple/Kakao OAuth completion, notification permission/scheduling/delivery, logged-in account deletion request, and current CoreDevice availability. `pnpm release:appstore-submit-gate` was rerun with network access and returned `Passed: 8`, `Blocked: 1`; App Store submission remains prohibited because App Store external status still blocks on iOS real-device availability and missing full iOS QA evidence.
- 2026-05-26 08:13 KST: `xcrun devicectl device process launch` successfully launched `com.jipbab.note` on the connected physical iPhone. Redacted launch evidence was saved to `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-25T23-12-09Z-ios-launch-check`, including `summary.md`, `devicectl-launch.json`, `devicectl-launch.log`, `devicectl-apps.json`, and `devicectl-devices.json`. The installed app entry shows version `1.0`, bundle version `2026052001`. Mobile MCP currently lists only iOS simulators, so physical iPhone screenshot capture was not available through that path. This proves app launch on the physical iPhone only; do not mark full iOS real-device QA confirmed until OAuth, notification, shopping-link, account-deletion, and raw-error checks are observed on-device.
- 2026-05-26 08:07 KST: Rechecked outside the sandbox. `pnpm check:real-device-availability` reports iOS physical device available and Android physical device none attached. `pnpm release:capture-ios-real-device-qa` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-25T23-06-48-979Z-real-device-qa-ios` with 3 passing captures and 0 blocked captures, including `real-device-availability.txt`, `ios-devicectl-devices.txt`, `ios-xctrace-devices.txt`, `native-artifacts.md`, and `manual-qa-template.md`. This packet confirms device/artifact availability only; do not mark full iOS QA confirmed until Google/Apple/Kakao OAuth, notification scheduling, shopping external link, logged-in account deletion, and raw-error checks are observed on the physical iPhone.
- 2026-05-26 07:55 KST: iPhone `[redacted-device]` is available and paired over CoreDevice. `pnpm check:real-device-availability -- --platform=ios` passed, and `pnpm release:capture-ios-real-device-qa` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-25T22-54-44-842Z-real-device-qa-ios` with 3 passing captures and 0 blocked captures. `xcrun devicectl device info apps` confirmed `com.jipbab.note` is installed as version `1.0`, build `2026052001`. `xcrun devicectl device process launch ... com.jipbab.note` is still blocked because the iPhone is locked, and iPhone Mirroring still requires the operator's Mac login password. Do not mark full iOS real-device QA confirmed until the iPhone is unlocked and Google/Apple/Kakao OAuth, local notification permission/scheduling, shopping link, and logged-in account deletion submission are observed on device.
- 2026-05-22 23:12 KST: iPhone `[redacted-device]` became available over wired CoreDevice and `pnpm check:real-device-availability -- --platform=ios` passed for iOS. iPhone Mirroring QA confirmed the app launches on physical iPhone, the core loop works through fridge seed ingredients -> recipe recommendation -> missing item shopping list -> purchased item reflected back into the fridge, and the production support/account-delete email now displays `dudqks2@gmail.com`. Evidence artifacts: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-55-26-439Z-real-device-qa-ios/screenshots/01-home.png` through `11-support-email-updated.png`. Email/password signup UI created a test account, but immediate login was blocked by Supabase email confirmation as designed; after operator confirmation of the test account, Supabase Auth password login returned a session. Do not mark full iOS real-device QA confirmed yet because Google/Apple/Kakao OAuth, local notification permission/scheduling, and logged-in account deletion submission were not fully observed on device.
- 2026-05-22 23:29 KST: Production OAuth callback handling was fixed and redeployed. The app now uses Supabase PKCE auth flow, `/auth/callback` reports provider errors when present, `pnpm check:oauth-live` passes Google/Apple/Kakao, and Playwright verified the production login buttons reach Google, Apple, and Kakao provider login pages using `response_type=code` and the production app callback target. This is provider-start evidence only; do not mark iOS Google/Apple/Kakao login confirmed until each provider completes real account consent and returns to `/mypage` on the physical iPhone.
- 2026-05-21 17:53 KST: iOS and Android real-device QA remains blocked because the iPhone is offline and no Android device is attached.
- 2026-05-21 18:15 KST: Rechecked outside the sandbox. iPhone `[redacted-device]` is still listed under `Devices Offline`, and `adb devices -l` still shows no attached Android device.
- 2026-05-21 18:24 KST: `xcrun devicectl list devices` reports iPhone `[redacted-device]` as `unavailable` (`iPhone 16 Pro`, `iPhone17,1`), `xcrun xctrace list devices` still lists it under `Devices Offline`, and `adb devices -l` still shows no attached Android device.
- 2026-05-21 18:30 KST: `pnpm check:real-device-availability` now reports the iOS blocker as `iOS CoreDevice unavailable: [redacted-device] ... unavailable iPhone 16 Pro (iPhone17,1)` and Android as `Android physical device: none attached`.
- 2026-05-21 18:45 KST: `pnpm release:external-status` reran the real-device gates. iOS remains blocked at CoreDevice `unavailable` for iPhone `[redacted-device]`; Android remains blocked with no attached physical device.
- 2026-05-21 18:54 KST: Stronger `pnpm release:external-status` rerun still blocks real-device availability with iPhone `[redacted-device]` CoreDevice `unavailable` and no attached Android physical device.
- 2026-05-21 18:56 KST: Stronger `pnpm release:external-check` passed Supabase write/RLS, OAuth, Vercel Production env, production family route, and production account-deletion route, then stopped at the same real-device availability blocker.
- 2026-05-21 19:00 KST: Evidence gate now also requires non-pending `iOS evidence date`, `iOS evidence artifacts`, `Android evidence date`, and `Android evidence artifacts`.
- 2026-05-21 19:02 KST: `pnpm release:external-status` still reports iPhone `[redacted-device]` CoreDevice `unavailable` and no attached Android physical device.
- 2026-05-21 19:10 KST: `pnpm release:capture-external-evidence` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-09-51-343Z` with real-device availability, CoreDevice, xctrace, and adb diagnostics for the current blocker.
- 2026-05-21 19:22 KST: Rechecked with `pnpm release:external-status`, `xcrun devicectl list devices`, `xcrun xctrace list devices`, and `adb devices -l`. iPhone `[redacted-device]` remains CoreDevice `unavailable` / `Devices Offline`, and Android still has no attached physical device. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-22-25-522Z`.
- 2026-05-21 19:38 KST: `pnpm release:capture-real-device-qa` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-38-01-050Z-real-device-qa` with native artifact inventory and a manual QA template. Real-device availability and Android installed-package checks remain blocked.
- 2026-05-21 20:29 KST: Rechecked with `pnpm check:real-device-availability` outside the sandbox. iPhone `[redacted-device]` remains CoreDevice `unavailable` (`iPhone 16 Pro`, `iPhone17,1`), and Android still has no attached physical device.
- 2026-05-21 20:40 KST: iPhone Mirroring can see the paired iPhone path but cannot proceed unattended. It first reported `iPhone 사용 중` and then required the Mac login password for `[redacted-operator-name]`; do not mark iOS QA confirmed until the operator unlocks this and the app flow is actually tested. Evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-40-real-device-blockers/iphone-mirroring-mac-password-required.png`.
- 2026-05-21 20:56 KST: Rechecked again with `pnpm check:real-device-availability`, `xcrun devicectl list devices`, `adb devices -l`, and iPhone Mirroring. iPhone `[redacted-device]` remains CoreDevice `unavailable`, no Android device is attached, and iPhone Mirroring still requires the Mac login password before QA can proceed.
- 2026-05-21 22:16 KST: `pnpm release:external-status` still reports iPhone `[redacted-device]` as CoreDevice `unavailable` and no attached Android physical device. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T13-15-49-074Z`.
- 2026-05-21 22:52 KST: Rechecked with `pnpm release:external-status`, `xcrun devicectl list devices`, and `/Users/jyb-m3max/Library/Android/sdk/platform-tools/adb devices -l`. iPhone `[redacted-device]` remains CoreDevice `unavailable`; Android still has no attached physical device. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T13-52-02-396Z`.
- 2026-05-22 18:34 KST: Rechecked with `pnpm release:external-status` and `pnpm release:capture-real-device-qa`. iPhone `[redacted-device]` still reports CoreDevice `unavailable`, Android still has no attached physical device, and the latest packet includes `device-unblock-checklist.md` for the exact CoreDevice/xctrace/adb unblock sequence. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T09-33-46-193Z-real-device-qa`.
- 2026-05-22 19:04 KST: Rechecked with escalated `pnpm check:real-device-availability` and Mobile MCP. iPhone `[redacted-device]` still reports CoreDevice `unavailable`, Android still has no attached physical device, and Mobile MCP lists only iOS simulators `iPhone 17` and `iPhone 16e`. Do not mark real-device QA confirmed until a physical iPhone/Android device is available and the manual QA checklist has been executed.
- 2026-05-22 22:05 KST: `pnpm release:capture-ios-real-device-qa` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-05-20-283Z-real-device-qa-ios`. The packet is scoped to iOS only, includes iOS archive/app/IPA inventory and iOS-only manual QA template, and still records 3 blocked iOS captures because iPhone `[redacted-device]` remains unavailable through `check-real-device-availability`, `devicectl`, and `xctrace`.
- 2026-05-22 22:21 KST: Latest full `pnpm release:capture-real-device-qa` nested inside the operator handoff generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-21-23-903Z-real-device-qa`. `check-real-device-availability --platform=all` still fails with iPhone `[redacted-device]` CoreDevice `unavailable` and Android physical device `none attached`; `adb devices -l` is empty, and `android-installed-package` remains blocked. Do not mark either platform confirmed.
