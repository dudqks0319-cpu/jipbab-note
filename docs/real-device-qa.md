# 집밥노트 실기기 QA 증거

Updated: 2026-05-22 22:26 KST

이 문서는 App Store / Play Store 제출 전 실제 기기 QA 완료 여부를 기록합니다.
`pnpm check:real-device-qa-evidence`는 아래 confirmation 문자열이 모두 채워지기 전까지 실패합니다.
각 플랫폼별 evidence date와 evidence artifacts도 실제 날짜와 스크린샷/로그/녹화 경로 또는 URL로 채워야 통과합니다.
기기 연결 전후에는 `pnpm release:capture-external-evidence`로 `output/release-evidence/<timestamp>/summary.md`와 원시 진단 파일을 먼저 남깁니다.
실기기 QA를 실행할 때는 `pnpm release:capture-real-device-qa`로 기기 상태, 설치 여부, native artifact inventory, `device-unblock-checklist.md`, `operator-checklist.md`, `manual-qa-template.md`를 함께 캡처합니다. App Store만 먼저 진행할 때는 `pnpm release:capture-ios-real-device-qa`로 iOS-only packet을 만들고, Play Store만 먼저 진행할 때는 `pnpm release:capture-android-real-device-qa`로 Android-only packet을 만듭니다. 이 패킷은 증거 수집용이며, 실제 체크를 보지 않은 상태에서 `confirmed`로 바꾸면 안 됩니다.

## Current Status

- iOS real-device QA: not confirmed
- Android real-device QA: not confirmed
- Latest iOS device check: iPhone `영빈` is listed as CoreDevice `unavailable`.
- Latest Android device check: no physical Android device is attached after direct Android SDK `adb` recheck.

## Unblock Checklist

### iOS device

- Unlock iPhone `영빈` and keep the screen awake during QA.
- Confirm the iPhone trusts this Mac if the trust prompt appears.
- Confirm Developer Mode is enabled on the iPhone.
- Reconnect the cable or use a data-capable cable if CoreDevice still shows `unavailable`.
- Rerun `xcrun devicectl list devices` and continue only when the state is available.

### Android device

- Connect a physical Android device over USB.
- Enable Developer options and USB debugging on the device.
- Accept the RSA debugging prompt if it appears.
- Rerun `adb devices -l` and continue only when a physical device appears as `device`, not `unauthorized` or empty.

## Required Confirmation Strings

아래 항목은 실제 기기에서 확인한 뒤 `confirmed`로 바꿉니다. 로그/스크린샷/녹화 경로는 같은 섹션에 함께 남깁니다.

### iOS

- iOS real-device QA: not confirmed
- Device: not confirmed
- iOS build: 2026052001
- Bundle ID: com.jipbab.note
- iOS core loop: not confirmed
- iOS Google login: not confirmed
- iOS Apple login: not confirmed
- iOS Kakao login: not confirmed
- iOS local notification permission and scheduling: not confirmed
- iOS shopping external link: not confirmed
- iOS account deletion request: not confirmed
- iOS raw error disclosure: not checked
- iOS evidence date: pending
- iOS evidence artifacts: pending

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

- 2026-05-22 23:12 KST: iPhone `영빈` became available over wired CoreDevice and `pnpm check:real-device-availability -- --platform=ios` passed for iOS. iPhone Mirroring QA confirmed the app launches on physical iPhone, the core loop works through fridge seed ingredients -> recipe recommendation -> missing item shopping list -> purchased item reflected back into the fridge, and the production support/account-delete email now displays `dudqks2@gmail.com`. Evidence artifacts: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-55-26-439Z-real-device-qa-ios/screenshots/01-home.png` through `11-support-email-updated.png`. Email/password signup UI created a test account, but immediate login was blocked by Supabase email confirmation as designed; after operator confirmation of the test account, Supabase Auth password login returned a session. Do not mark full iOS real-device QA confirmed yet because Google/Apple/Kakao OAuth, local notification permission/scheduling, and logged-in account deletion submission were not fully observed on device.
- 2026-05-21 17:53 KST: iOS and Android real-device QA remains blocked because the iPhone is offline and no Android device is attached.
- 2026-05-21 18:15 KST: Rechecked outside the sandbox. iPhone `영빈` is still listed under `Devices Offline`, and `adb devices -l` still shows no attached Android device.
- 2026-05-21 18:24 KST: `xcrun devicectl list devices` reports iPhone `영빈` as `unavailable` (`iPhone 16 Pro`, `iPhone17,1`), `xcrun xctrace list devices` still lists it under `Devices Offline`, and `adb devices -l` still shows no attached Android device.
- 2026-05-21 18:30 KST: `pnpm check:real-device-availability` now reports the iOS blocker as `iOS CoreDevice unavailable: 영빈 ... unavailable iPhone 16 Pro (iPhone17,1)` and Android as `Android physical device: none attached`.
- 2026-05-21 18:45 KST: `pnpm release:external-status` reran the real-device gates. iOS remains blocked at CoreDevice `unavailable` for iPhone `영빈`; Android remains blocked with no attached physical device.
- 2026-05-21 18:54 KST: Stronger `pnpm release:external-status` rerun still blocks real-device availability with iPhone `영빈` CoreDevice `unavailable` and no attached Android physical device.
- 2026-05-21 18:56 KST: Stronger `pnpm release:external-check` passed Supabase write/RLS, OAuth, Vercel Production env, production family route, and production account-deletion route, then stopped at the same real-device availability blocker.
- 2026-05-21 19:00 KST: Evidence gate now also requires non-pending `iOS evidence date`, `iOS evidence artifacts`, `Android evidence date`, and `Android evidence artifacts`.
- 2026-05-21 19:02 KST: `pnpm release:external-status` still reports iPhone `영빈` CoreDevice `unavailable` and no attached Android physical device.
- 2026-05-21 19:10 KST: `pnpm release:capture-external-evidence` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-09-51-343Z` with real-device availability, CoreDevice, xctrace, and adb diagnostics for the current blocker.
- 2026-05-21 19:22 KST: Rechecked with `pnpm release:external-status`, `xcrun devicectl list devices`, `xcrun xctrace list devices`, and `adb devices -l`. iPhone `영빈` remains CoreDevice `unavailable` / `Devices Offline`, and Android still has no attached physical device. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-22-25-522Z`.
- 2026-05-21 19:38 KST: `pnpm release:capture-real-device-qa` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T10-38-01-050Z-real-device-qa` with native artifact inventory and a manual QA template. Real-device availability and Android installed-package checks remain blocked.
- 2026-05-21 20:29 KST: Rechecked with `pnpm check:real-device-availability` outside the sandbox. iPhone `영빈` remains CoreDevice `unavailable` (`iPhone 16 Pro`, `iPhone17,1`), and Android still has no attached physical device.
- 2026-05-21 20:40 KST: iPhone Mirroring can see the paired iPhone path but cannot proceed unattended. It first reported `iPhone 사용 중` and then required the Mac login password for `정영빈`; do not mark iOS QA confirmed until the operator unlocks this and the app flow is actually tested. Evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T20-40-real-device-blockers/iphone-mirroring-mac-password-required.png`.
- 2026-05-21 20:56 KST: Rechecked again with `pnpm check:real-device-availability`, `xcrun devicectl list devices`, `adb devices -l`, and iPhone Mirroring. iPhone `영빈` remains CoreDevice `unavailable`, no Android device is attached, and iPhone Mirroring still requires the Mac login password before QA can proceed.
- 2026-05-21 22:16 KST: `pnpm release:external-status` still reports iPhone `영빈` as CoreDevice `unavailable` and no attached Android physical device. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T13-15-49-074Z`.
- 2026-05-21 22:52 KST: Rechecked with `pnpm release:external-status`, `xcrun devicectl list devices`, and `/Users/jyb-m3max/Library/Android/sdk/platform-tools/adb devices -l`. iPhone `영빈` remains CoreDevice `unavailable`; Android still has no attached physical device. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-21T13-52-02-396Z`.
- 2026-05-22 18:34 KST: Rechecked with `pnpm release:external-status` and `pnpm release:capture-real-device-qa`. iPhone `영빈` still reports CoreDevice `unavailable`, Android still has no attached physical device, and the latest packet includes `device-unblock-checklist.md` for the exact CoreDevice/xctrace/adb unblock sequence. New local evidence artifact: `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T09-33-46-193Z-real-device-qa`.
- 2026-05-22 19:04 KST: Rechecked with escalated `pnpm check:real-device-availability` and Mobile MCP. iPhone `영빈` still reports CoreDevice `unavailable`, Android still has no attached physical device, and Mobile MCP lists only iOS simulators `iPhone 17` and `iPhone 16e`. Do not mark real-device QA confirmed until a physical iPhone/Android device is available and the manual QA checklist has been executed.
- 2026-05-22 22:05 KST: `pnpm release:capture-ios-real-device-qa` generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-05-20-283Z-real-device-qa-ios`. The packet is scoped to iOS only, includes iOS archive/app/IPA inventory and iOS-only manual QA template, and still records 3 blocked iOS captures because iPhone `영빈` remains unavailable through `check-real-device-availability`, `devicectl`, and `xctrace`.
- 2026-05-22 22:21 KST: Latest full `pnpm release:capture-real-device-qa` nested inside the operator handoff generated `/Users/jyb-m3max/Desktop/codex/jipbab-note/output/release-evidence/2026-05-22T13-21-23-903Z-real-device-qa`. `check-real-device-availability --platform=all` still fails with iPhone `영빈` CoreDevice `unavailable` and Android physical device `none attached`; `adb devices -l` is empty, and `android-installed-package` remains blocked. Do not mark either platform confirmed.
