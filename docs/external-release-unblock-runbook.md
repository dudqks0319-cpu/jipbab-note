# 집밥노트 외부 출시 차단 해제 런북

이 문서는 코드/백엔드 게이트가 통과한 뒤에도 남는 외부 차단을 해제하는 순서입니다.
아래 항목은 실제 콘솔, 실제 기기, 실제 계정 상태를 봐야 하므로 확인 전에는 `confirmed`로 바꾸지 않습니다.

Latest evidence packet: `<repo>/output/release-evidence/2026-05-27T03-46-27-019Z` captured on 2026-05-27 12:46 KST. It preserves the current external-status, real-device availability, real-device QA evidence, and store-console confirmation outputs; review it for screenshots, account names, device identifiers, and other sensitive details before sharing.

## 현재 차단

- Supabase migration history: remote에는 publication `20260710130000`, Phase 1 schema `20260710150000`, Phase 2 rate limit `20260710160000`, signed-session hardening `20260715101716`까지 기록돼 있고 2026-07-15 live schema 대조도 완료했다. 다만 그보다 앞선 로컬 누락 이력 6개와 Phase 1 catalog seed `20260710151000`은 아직 정리되지 않았으므로 전체 `supabase db push` 또는 SQL bundle 재실행은 금지한다.
- Phase 0/1/2 DB rollout: publication gate, Phase 1 schema, distributed rate limit, signed guest auth는 운영에 적용돼 있다. 운영 DB의 미검수 recipes 1,152건은 승인·발행·evidence-ready 모두 0건이고 공개 API는 빈 승인 목록만 반환한다. 남은 DB 작업은 catalog seed와 과거 이력 정리, 복원 rehearsal, 실제 승인 staging fixture 검증이다.
- 실기기 QA: 최신 `pnpm release:external-status`는 iOS CoreDevice를 `unavailable iPhone 16 Pro (iPhone17,1)`로 보고하고, Android 물리 기기는 미연결입니다. iOS/Android 실제 QA 증거도 아직 gate를 통과하지 못합니다.
- Play Console 내부 테스트: 개발자 계정 설정/검증과 Google Play Developer API credential이 미완료라 AAB 업로드 및 내부 테스트 트랙 확인이 막혀 있습니다.
- App Store Connect/TestFlight: 2026-07-10 `pnpm check:store-console-confirmation -- --platform=appstore` 재확인에서 build `2026062602`가 `VALID`이고 내부 TestFlight 그룹이 존재했습니다. 제출 직전에는 같은 명령 또는 App Store Connect API로 다시 확인합니다.

브라우저 로그인 상태가 반복해서 끊기면 [store-api-credentials-runbook.md](<repo>/docs/store-api-credentials-runbook.md)를 먼저 설정해 `.env.store-api.local` + `.release-secrets/` 기반으로 `pnpm check:store-console-confirmation`이 공식 API로 TestFlight/Internal testing 상태를 확인하게 합니다.

## 0. Supabase migration history·백업·Phase 0/1/2 staging 검증

운영자가 먼저 해야 할 일:

- live schema에서 `20260521160347` 이후 로컬 migration 각각의 실제 적용 상태를 확인하고, 아직 기록되지 않은 과거 이력 6개만 안전하게 복구합니다. 이미 적용된 `20260710130000`, `20260710150000`, `20260710160000`은 재실행하지 않습니다.
- 비공개 `ops_backup`에는 Phase 0/1 적용 전 recipes 1,152건·정책 8건·migration history 19건과 signed-session 적용 전 동기화 데이터·정책·함수·history가 보존돼 있습니다. 이 스냅샷을 대상으로 실제 복원 rehearsal을 완료합니다.
- staging에는 현재 원격 이력과 live schema를 기준으로 미적용인 `supabase/migrations/20260710151000_seed_phase1_ingredient_catalog.sql`과 필요한 과거 이력 복구만 적용합니다. publication/auth/schema/rate-limit migration은 새 빈 staging branch가 아닌 이상 중복 실행하지 않습니다.
- staging에서 version capture/edit/restore 왕복, 같은 recipe 안의 step-ingredient 무결성, alias 유일성, non-destructive rollback을 실제 PostgreSQL로 검증합니다.
- staging에서 무서명 요청, 위조 `x-device-id`, 다른 signed user, anonymous user의 family/community write가 모두 차단되는지 확인합니다.
- staging 서버에 32자 이상의 server-only `API_RATE_LIMIT_HMAC_SECRET`을 설정하고 목록·상세·추천 API의 정상, `429`, `503`, 잘못된 입력 경로를 검증합니다. 자세한 계약은 `docs/api-v1-operations.md`를 따릅니다.
- 운영 publication/auth/schema/rate-limit과 matching web build는 적용·검증 완료 상태입니다. 이후 운영 DB 변경은 catalog seed, 과거 이력 복구, 복원 rehearsal을 각각 분리하고 사전/사후 count를 남깁니다. 익명 동기화 feature flag는 현재 운영에서 활성화됐으므로 CAPTCHA·rate limit·abuse monitoring을 후속 보안 항목으로 유지합니다.
- 기존 migration 파일은 수정하지 않습니다.

SQL Editor에 붙여 넣을 정확한 bundle은 아래 명령으로 출력합니다.

확인 전 `pnpm release:supabase-live-unblock-sql`은 의도적으로 실패합니다. 아래 acknowledgement는 실제 확인을 마친 운영자만 설정합니다.

```bash
SUPABASE_MIGRATION_HISTORY_RECONCILED=1 SUPABASE_BACKUP_VERIFIED=1 pnpm release:supabase-live-unblock-sql
```

그 다음 실행:

```bash
SUPABASE_MIGRATION_HISTORY_RECONCILED=1 SUPABASE_BACKUP_VERIFIED=1 pnpm release:supabase-live-unblock-check
pnpm release:external-status
```

세부 실패 지점을 따로 확인해야 하면 아래 명령을 개별 실행합니다.

```bash
pnpm check:supabase-release
SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live
pnpm check:supabase-storage-live
```

확인할 항목:

- `check:supabase-release`가 `family fridge and shopping rows are member-scoped`를 PASS로 표시
- `check:supabase-live`에서 unsigned/device-header 접근 0건, signed owner readback, cross-user 차단, family member read, non-member 차단 PASS
- `check:supabase-storage-live`에서 unauthenticated upload와 cross-prefix upload 차단, permanent user auth UID prefix upload PASS
- `/api/recipes`가 검수 증거 없는 레시피를 0건 반환

## 1. 실기기 QA 해제

운영자가 먼저 해야 할 일:

- iPhone `[redacted-device]`을 잠그고, Mac의 iPhone Mirroring 잠금 화면에 Mac 로그인 암호를 입력합니다.
- iPhone에서 이 Mac 신뢰, Developer Mode, 화면 잠금 해제 상태를 확인합니다.
- Android 물리 기기를 USB로 연결하고, 개발자 옵션과 USB 디버깅을 켠 뒤 RSA 프롬프트를 허용합니다.

그 다음 실행:

```bash
pnpm check:real-device-availability
pnpm release:capture-real-device-qa
```

App Store만 먼저 진행할 때는 Android 기기 차단과 섞지 않도록 아래 iOS 전용 packet도 같이 만듭니다.

```bash
pnpm release:capture-ios-real-device-qa
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

완료 후 [real-device-qa.md](<repo>/docs/real-device-qa.md)에 `confirmed`, evidence date, evidence artifacts를 실제 증거 기준으로만 갱신합니다.

## 2. App Store Connect/TestFlight 재확인

운영자가 먼저 해야 할 일:

- 최신 게이트에서는 App Store Connect/TestFlight가 PASS입니다.
- 제출 직전 App Store Connect에 Apple 계정으로 재로그인하거나 App Store Connect API credential을 사용합니다.
- JipbabNote 앱 레코드를 엽니다.
- 직접 URL: `https://appstoreconnect.apple.com/teams/d0f73d2e-b3a6-49ef-938f-4639fea25fee/apps/6762567054/testflight/ios`
- 앱 메뉴가 `jipbab-note`인지 확인합니다.
- iOS build `2026062602` 처리 완료 상태를 확인합니다.
- 내부 테스터 그룹이 이 빌드를 설치할 수 있는지 확인합니다.

완료 후 [store-console-confirmation.md](<repo>/docs/store-console-confirmation.md)에서 아래 항목만 실제 화면 증거 기준으로 갱신합니다.

- `App Store Connect/TestFlight: confirmed`
- `TestFlight processing: confirmed`
- `Internal tester availability: confirmed`
- `App Store Connect evidence date`
- `App Store Connect evidence artifacts`

## 3. Play Console 내부 테스트 해제

운영자가 먼저 해야 할 일:

- Google Play Console 개발자 계정 `[redacted-operator-name]`의 본인 확인을 완료합니다.
- Play Console 모바일 앱으로 Android 휴대기기 접근 확인을 완료합니다.
- 연락처 전화번호 인증을 완료합니다.
- 앱 만들기가 활성화되면 패키지명 `com.jipbab.note`로 앱을 생성합니다.
- 서명된 `android/app/build/outputs/bundle/release/app-release.aab`를 내부 테스트 트랙에 업로드합니다.
- 내부 테스트 트랙이 생성되고 처리/사용 가능한 상태인지 확인합니다.

완료 후 [store-console-confirmation.md](<repo>/docs/store-console-confirmation.md)에서 아래 항목만 실제 화면 증거 기준으로 갱신합니다.

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
pnpm release:store-api-credential-status
pnpm check:store-console-confirmation
pnpm release:capture-store-console
pnpm release:capture-store-submission-packet
pnpm release:capture-appstore-review-packet
pnpm release:store-api-runbook
pnpm release:appstore-submit-gate
pnpm release:playstore-submit-gate
pnpm release:external-status
pnpm release:goal-check
pnpm release:submit-gate
```

`pnpm release:appstore-submit-gate`, `pnpm release:playstore-submit-gate`, `pnpm release:goal-check`에서 `Blocked: 0`, `Missing: 0`이 나오고 `pnpm release:submit-gate`가 PASS가 되기 전까지 활성 goal을 완료 처리하거나 스토어 심사 제출을 진행하지 않습니다.
