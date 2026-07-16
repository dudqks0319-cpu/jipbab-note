# 집밥노트 Release Status

## 한 줄 상태

이미지 포함 최신 iOS build `2026062602`가 App Store Connect에 업로드되고 iOS 앱 버전 `1.0`에 연결된 뒤, 2026-06-27 10:15 KST에 App Review로 제출됐습니다. 2026-06-28 10:07 KST App Store 개발자 출시 요청을 생성했고, App Store Connect API 재확인에서 버전 상태가 `READY_FOR_SALE`로 바뀐 것을 확인했습니다. Release request ID는 `a49b3ba6-b9f5-4d55-97ea-7665ee7e747e`입니다. 연결 빌드는 `2026062602`, 빌드 ID는 `9006b306-e08c-4091-829c-2934615be184`, 빌드 처리 상태는 `VALID`입니다.

2026-06-29 17:02 KST에는 공개 App Store 조회가 계속 `resultCount: 0` / 404로 남아 있어 App Store Connect `appAvailabilityV2` 누락을 확인했고, 한국(KOR)과 미국(USA)만 `available: true`인 국가 가용성 리소스를 생성했습니다. App Store Connect API 재확인에서 `appAvailabilityV2`는 200으로 조회되며, 가격 스케줄도 base territory `KOR`로 유효합니다. 2026-06-29 17:16 KST 공개 App Store 직접 URL은 `/kr/app/집밥노트/id6762567054`로 리다이렉트된 뒤 HTTP 200으로 열렸고, Chrome에서도 `집밥노트 앱 - App Store` 공개 페이지를 확인했습니다. iTunes Lookup API만 아직 `resultCount: 0`으로 지연 중입니다. 증거: `output/release-evidence/2026-06-29T08-02-34-508Z-appstore-availability-enable-kor-usa/summary.md`.

제출 전 구버전 build `2026060802`가 걸려 있던 기존 출시 대기 버전은 취소했고, App Store 스크린샷도 최신 iPhone 캡처 5장으로 교체했습니다. 최종 스크린샷 세트는 `01-home.png`, `02-fridge.png`, `03-recipe.png`, `04-shopping.png`, `05-mypage.png`이며 모두 `1290x2796`이고 App Store API에서 `COMPLETE` 상태입니다. 기존 스크린샷은 새 스크린샷 완료 후 삭제했습니다.

QA 기준 App Store 제출 차단점은 해소됐습니다. 사용자가 TestFlight에서 Kakao 로그인 완료와 직접 계정삭제 완료를 확인했고, 계정삭제 완료 스크린샷 증거도 보존했습니다. 현재 iOS App Store Connect 상태는 `READY_FOR_SALE`이고, 한국/미국 공개 App Store 직접 URL도 live입니다.

2026-06-30 19:28 KST에는 현재 출시 앱이 로드하는 `https://jipbab-note-app.vercel.app` Vercel production alias를 최신 홈/냉장고/레시피/장보기 UX 수정분으로 재배포했습니다. 출시된 iOS build `1.0 (2026062602)`는 Capacitor remote URL mode로 이 production alias를 로드하므로, App Store Connect 새 바이너리 심사 없이 앱 안 원격 화면에 이번 수정분이 반영됩니다. 배포 URL은 `https://jipbab-note-472i3yg6l-youngbeens-projects.vercel.app`이고, production `/shopping` HTTP 200 및 `로켓프레시식 카테고리`/`쿠팡 링크`/`173개` 렌더링을 확인했습니다.

## 현재 후보

- Version: `1.0`
- Build: `2026062602`
- Git SHA: `587b993`
- Branch: `cloudflare-workers-setup`
- Phase: `appstore_public_url_live_lookup_api_pending`
- 원장: `release-ledger.yaml`

## 통과 또는 기록된 증거

- 이미지 포함 Vercel production 배포 및 이미지 HTTP 200 확인: `docs/current-release-state.md`
- iOS archive/upload/export 및 `pnpm check:ios-release` 통과 기록: `docs/current-release-state.md`
- App Store Connect/TestFlight build `2026062602` VALID 및 App Store version `PENDING_DEVELOPER_RELEASE` 확인: `output/release-evidence/2026-06-28T01-00-56-653Z-appstore-review-preflight/summary.md`
- App Store 개발자 출시 요청 생성 및 App Store version `READY_FOR_SALE` 확인: `output/release-evidence/2026-06-28T01-07-50-978Z-appstore-developer-release/summary.md`
- App Store version `READY_FOR_SALE` 재확인: `output/release-evidence/2026-06-28T01-08-06-521Z-appstore-review-preflight/summary.md`
- App Store 국가 가용성 생성(KOR/USA only), `appAvailabilityV2` 200 확인, KR/US 공개 App Store 직접 URL HTTP 200 확인, iTunes Lookup API 지연 기록: `output/release-evidence/2026-06-29T08-02-34-508Z-appstore-availability-enable-kor-usa/summary.md`
- App Store 출시 앱 원격 WebView production UX 갱신: `output/ui-evidence/shopping-production-vercel-cdp-390.png`
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

- P1: iTunes Lookup API 전파 대기: 공개 App Store 직접 URL은 live지만 Lookup API는 아직 `resultCount: 0`
- P0: Android Google/Kakao 로그인 완료와 로그인 후 계정삭제 미확정
- P0: Play Console 제출 증거 미완료
- P1: Cloudflare secret, custom domain, Supabase Auth redirect, mobile runtime URL 전환

## 다음 행동

App Store iOS `1.0 (2026062602)`는 `READY_FOR_SALE` 상태이고 KOR/USA 국가 가용성도 생성됐습니다. 공개 App Store 직접 URL은 live입니다. Android/Play Console과 Cloudflare 전환은 별도 릴리스 범위로 남아 있습니다.
