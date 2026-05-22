# 집밥노트 외부 출시 차단 해제 런북

이 문서는 코드/백엔드 게이트가 통과한 뒤에도 남는 외부 차단을 해제하는 순서입니다.
아래 항목은 실제 콘솔, 실제 기기, 실제 계정 상태를 봐야 하므로 확인 전에는 `confirmed`로 바꾸지 않습니다.

## 현재 차단

- 실기기 QA: iPhone `영빈`은 CoreDevice `unavailable`, iPhone Mirroring은 Mac 로그인 암호 입력 필요, Android 물리 기기는 미연결입니다.
- App Store Connect/TestFlight: JipbabNote 앱 레코드는 보였지만, 직접 TestFlight URL이 `authResult=FAILED`로 돌아가므로 Apple 계정 재인증이 필요합니다.
- Play Console 내부 테스트: 개발자 계정 설정이 미완료라 앱 생성, AAB 업로드, 내부 테스트 트랙 생성이 막혀 있습니다.

브라우저 로그인 상태가 반복해서 끊기면 [store-api-credentials-runbook.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-api-credentials-runbook.md)를 먼저 설정해 `.env.store-api.local` + `.release-secrets/` 기반으로 `pnpm check:store-console-confirmation`이 공식 API로 TestFlight/Internal testing 상태를 확인하게 합니다.

## 1. 실기기 QA 해제

운영자가 먼저 해야 할 일:

- iPhone `영빈`을 잠그고, Mac의 iPhone Mirroring 잠금 화면에 Mac 로그인 암호를 입력합니다.
- iPhone에서 이 Mac 신뢰, Developer Mode, 화면 잠금 해제 상태를 확인합니다.
- Android 물리 기기를 USB로 연결하고, 개발자 옵션과 USB 디버깅을 켠 뒤 RSA 프롬프트를 허용합니다.

그 다음 실행:

```bash
pnpm check:real-device-availability
pnpm release:capture-real-device-qa
```

실제 기기에서 확인할 항목:

- iOS/Android 홈, 냉장고, 레시피, 장보기 진입
- 냉장고 재료 추가/수정/삭제
- 재료 기반 추천 레시피 확인
- 레시피 상세에서 부족 재료 장보기 추가
- 장보기 완료 항목 냉장고 반영
- Google, Apple, Kakao 로그인 동작
- 로컬 알림 권한 및 예약
- 외부 쇼핑 링크 열림
- 계정 삭제 요청 화면 접근
- 오류 화면에 raw error, stack trace, env 이름 미노출

완료 후 [real-device-qa.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/real-device-qa.md)에 `confirmed`, evidence date, evidence artifacts를 실제 증거 기준으로만 갱신합니다.

## 2. App Store Connect/TestFlight 해제

운영자가 먼저 해야 할 일:

- App Store Connect에 Apple 계정으로 재로그인합니다.
- JipbabNote 앱 레코드를 엽니다.
- 직접 URL: `https://appstoreconnect.apple.com/teams/d0f73d2e-b3a6-49ef-938f-4639fea25fee/apps/6762567054/testflight/ios`
- 앱 메뉴가 `jipbab-note`인지 확인합니다.
- iOS build `2026052001` 처리 완료 상태를 확인합니다.
- 내부 테스터 그룹이 이 빌드를 설치할 수 있는지 확인합니다.

완료 후 [store-console-confirmation.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-console-confirmation.md)에서 아래 항목만 실제 화면 증거 기준으로 갱신합니다.

- `App Store Connect/TestFlight: confirmed`
- `TestFlight processing: confirmed`
- `Internal tester availability: confirmed`
- `App Store Connect evidence date`
- `App Store Connect evidence artifacts`

## 3. Play Console 내부 테스트 해제

운영자가 먼저 해야 할 일:

- Google Play Console 개발자 계정 `정영빈`의 본인 확인을 완료합니다.
- Play Console 모바일 앱으로 Android 휴대기기 접근 확인을 완료합니다.
- 연락처 전화번호 인증을 완료합니다.
- 앱 만들기가 활성화되면 패키지명 `com.jipbab.note`로 앱을 생성합니다.
- 서명된 `android/app/build/outputs/bundle/release/app-release.aab`를 내부 테스트 트랙에 업로드합니다.
- 내부 테스트 트랙이 생성되고 처리/사용 가능한 상태인지 확인합니다.

완료 후 [store-console-confirmation.md](/Users/jyb-m3max/Desktop/codex/jipbab-note/docs/store-console-confirmation.md)에서 아래 항목만 실제 화면 증거 기준으로 갱신합니다.

- `Play Console internal testing: confirmed`
- `AAB upload: confirmed`
- `Internal testing track: confirmed`
- `Play Console evidence date`
- `Play Console evidence artifacts`

## 4. 최종 검증 순서

외부 차단을 해제한 직후 아래 순서로 실행합니다.

```bash
pnpm release:capture-operator-handoff
pnpm release:security-check
pnpm check:real-device-availability
pnpm check:real-device-qa-evidence
pnpm check:store-console-confirmation
pnpm release:capture-store-console
pnpm release:store-api-runbook
pnpm release:external-status
pnpm release:goal-check
```

`pnpm release:goal-check`에서 `Blocked: 0`, `Missing: 0`이 나오기 전까지 활성 goal을 완료 처리하지 않습니다.
