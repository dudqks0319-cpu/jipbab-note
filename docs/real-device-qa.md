# 집밥노트 실기기 QA 증거

Updated: 2026-05-21 18:30 KST

이 문서는 App Store / Play Store 제출 전 실제 기기 QA 완료 여부를 기록합니다.
`pnpm check:real-device-qa-evidence`는 아래 confirmation 문자열이 모두 채워지기 전까지 실패합니다.

## Current Status

- iOS real-device QA: not confirmed
- Android real-device QA: not confirmed
- Latest iOS device check: iPhone `영빈` is listed as CoreDevice `unavailable` and xctrace `Devices Offline`.
- Latest Android device check: no physical Android device is attached after sandbox-escalated `adb devices -l`.

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

## Evidence Log

- 2026-05-21 17:53 KST: iOS and Android real-device QA remains blocked because the iPhone is offline and no Android device is attached.
- 2026-05-21 18:15 KST: Rechecked outside the sandbox. iPhone `영빈` is still listed under `Devices Offline`, and `adb devices -l` still shows no attached Android device.
- 2026-05-21 18:24 KST: `xcrun devicectl list devices` reports iPhone `영빈` as `unavailable` (`iPhone 16 Pro`, `iPhone17,1`), `xcrun xctrace list devices` still lists it under `Devices Offline`, and `adb devices -l` still shows no attached Android device.
- 2026-05-21 18:30 KST: `pnpm check:real-device-availability` now reports the iOS blocker as `iOS CoreDevice unavailable: 영빈 ... unavailable iPhone 16 Pro (iPhone17,1)` and Android as `Android physical device: none attached`.
