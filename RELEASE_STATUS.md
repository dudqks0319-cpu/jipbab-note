# 집밥노트 Release Status

## 한 줄 상태

이미지 포함 최신 iOS build `2026062602`가 App Store Connect에 업로드되고 iOS 앱 버전 `1.0`에 연결된 뒤, 2026-06-27 10:15 KST에 App Review로 제출됐습니다. App Store Connect UI는 `iOS 앱 1.0`, `1.0 (2026062602)`, 상태 `심사 대기 중`, 제출 ID `a549c625-233f-40b9-aa4c-2f8638ed6d0b`를 표시합니다. App Store API 재확인에서도 버전 상태가 `WAITING_FOR_REVIEW`, 빌드 처리 상태가 `VALID`입니다.

제출 전 구버전 build `2026060802`가 걸려 있던 기존 출시 대기 버전은 취소했고, App Store 스크린샷도 최신 iPhone 캡처 5장으로 교체했습니다. 최종 스크린샷 세트는 `01-home.png`, `02-fridge.png`, `03-recipe.png`, `04-shopping.png`, `05-mypage.png`이며 모두 `1290x2796`이고 App Store API에서 `COMPLETE` 상태입니다. 기존 스크린샷은 새 스크린샷 완료 후 삭제했습니다.

QA 기준 App Store 제출 차단점은 해소됐습니다. 사용자가 TestFlight에서 Kakao 로그인 완료와 직접 계정삭제 완료를 확인했고, 계정삭제 완료 스크린샷 증거도 보존했습니다. 현재 iOS App Store 쪽은 Apple 심사 대기만 남았습니다. 수동 출시가 선택되어 있으므로 승인 후 별도 출시 클릭이 필요합니다.

## 현재 후보

- Version: `1.0`
- Build: `2026062602`
- Git SHA: `587b993`
- Branch: `cloudflare-workers-setup`
- Phase: `appstore_waiting_for_review`
- 원장: `release-ledger.yaml`

## 통과 또는 기록된 증거

- 이미지 포함 Vercel production 배포 및 이미지 HTTP 200 확인: `docs/current-release-state.md`
- iOS archive/upload/export 및 `pnpm check:ios-release` 통과 기록: `docs/current-release-state.md`
- App Store Connect/TestFlight build `2026062602` VALID 및 App Store version `WAITING_FOR_REVIEW` 확인: `output/release-evidence/2026-06-27T01-16-29-117Z-appstore-review-preflight/summary.md`
- App Store Review 제출 완료 UI 증거: `output/release-evidence/2026-06-27T-appstore-review-submitted/summary.md`
- App Store 최신 스크린샷 5장 교체 완료 증거: `output/release-evidence/2026-06-27T-appstore-screenshot-refresh/appstore-screenshot-refresh.md`
- 케이블 연결 iPhone 12 Pro build `2026062601` install/launch/process/display 증거: `output/release-evidence/2026-06-26T11-10-cable-ios-qa/summary.md`
- `pnpm check:ios-cable-qa` 통과 및 App Store external status 게이트 연결
- iOS XCUITest 케이블 자동화 타깃 추가 및 5개 기본 탭, 레시피-장보기 core loop, 장보기 외부 링크 Safari handoff, 로컬 알림 3개 준비 smoke 통과: `output/release-evidence/2026-06-25T09-30-ios-xcuitest-cable-smoke/summary.md`
- iOS Google/Apple OAuth completion PASS, 계정삭제 화면 접근 PASS 기록: `output/release-evidence/2026-06-25T13-00-ios-native-bridge-oauth-rerun/summary.md`
- iPhone Mirroring iPhone 16 Pro Kakao provider-start PASS 기록: `output/release-evidence/2026-06-26T08-40-kakao-mirroring-provider-start/summary.md`
- iOS Kakao 앱 열기 콜백 보강 production 배포 및 잠금으로 인한 post-deploy 미확인 기록: `output/release-evidence/2026-06-26T09-20-kakao-open-callback-fix/summary.md`
- TestFlight Kakao login operator-confirmed 및 직접 계정삭제 production 배포 기록: `output/release-evidence/2026-06-26T10-39-direct-account-delete-fix/summary.md`
- iOS 직접 계정삭제 완료 스크린샷 증거: `output/release-evidence/2026-06-26T13-56-ios-account-delete-completed/summary.md`
- App Store Connect UI/API 빌드 불일치 증거(해결됨): `output/release-evidence/2026-06-26T14-10-appstore-ui-build-mismatch/summary.md`
- App Store 전용 리뷰 패킷 재생성: `output/release-evidence/2026-06-25T04-55-20-421Z-appstore-review-packet/appstore-review-packet.md`
- iOS/Android 실기기 부분 QA 기록: `docs/real-device-qa.md`
- iOS native ASWebAuthenticationSession OAuth rerun 및 clean-install blocker 증거(13:00 KST bridge rerun으로 superseded): `output/release-evidence/2026-06-25T12-45-ios-aswebauth-oauth-rerun4-clean-install/summary.md`

## 막힌 항목

- P0: Android Google/Kakao 로그인 완료와 로그인 후 계정삭제 미확정
- P0: Play Console 제출 증거 미완료
- P1: Cloudflare secret, custom domain, Supabase Auth redirect, mobile runtime URL 전환

## 다음 행동

App Store iOS는 Apple Review 결과를 기다립니다. 승인되면 App Store Connect에서 수동 출시를 눌러야 실제 공개됩니다. Android/Play Console과 Cloudflare 전환은 별도 릴리스 범위로 남아 있습니다.
