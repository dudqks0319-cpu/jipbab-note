# 집밥노트 출시 직전 체크리스트

## 1. 로컬 출시 게이트

아래 명령은 필수 운영 환경변수, OAuth 제공자 플래그, 지원 이메일, Capacitor 서버 URL, 핵심 라우트 파일 존재 여부, 스토어 문서, App Store/Play Store 이미지 자산 규격, 초보자 큐레이션 레시피 품질, 전용 레시피 이미지, 이미지 출처 문서, 재료 카탈로그 규모, Supabase 출시 스키마/RLS/정책 계약, 쿠팡 파트너 링크 권한, iOS/Android Capacitor 런타임 설정, iOS archive/IPA 산출물, Android AAB 서명 상태를 로컬에서 결정적으로 확인합니다. 환경변수 값은 출력하지 않고 누락/설정 상태만 표시합니다.

```bash
pnpm release:check
```

- [ ] `pnpm release:check` 실행
- [ ] GitHub Actions `Release Gate` 워크플로가 push/PR에서 green인지 확인 (`pnpm test`, `pnpm build`, `pnpm release:ci-static-check`)
- [ ] `pnpm release:security-check` 실행: production dependency audit와 secret 파일 git 추적 여부 확인
- [ ] `pnpm check:core-loop-release` 실행: 냉장고 재료 → 추천 레시피 → 부족 재료 장보기 → 구매 후 냉장고 반영 루프 PASS 확인
- [ ] `pnpm check:local-mode-release` 실행: Supabase 빈 응답/지연 상황에서도 로컬 재료·장보기 데이터와 로그인 동기화 상태가 보존되는지 확인
- [ ] `pnpm release:ci-static-check` 실행: CI-safe Supabase SQL/RLS 계약, 파트너 링크, 스토어 자산, 보안 audit/secret 추적 게이트 확인
- [ ] 모든 로컬 게이트가 실행됐는지 확인 (`release-readiness`, `supabase-release`, `partner-links`, `store-assets`, `ios-release`, `android-release`)
- [ ] hard blocker 0개 및 `Release gate summary` 실패 0개 확인
- [ ] `pnpm store-assets:prepare` 실행: App Store 6.9형 스크린샷, Play Store 휴대전화 스크린샷, Play Store 기능 그래픽 생성 확인
- [ ] `pnpm check:store-assets` 실행: App Store 1290x2796 PNG 5장, Play Store 1080x1920 JPG 5장, 1024x500 RGB 기능 그래픽, 512x512 RGB 아이콘 PASS 확인
- [ ] `pnpm release:capture-store-submission-packet` 실행: App Store/Play Store 메타데이터와 업로드용 이미지 파일을 한 로컬 패킷으로 복사
- [ ] `pnpm release:capture-appstore-review-packet` 실행: iOS가 먼저 준비됐을 때 App Store 전용 메타데이터, 스크린샷, iOS 산출물, App Store 제출 게이트 상태를 한 로컬 패킷으로 복사
- [ ] `pnpm release:full-check` 실행: 로컬 게이트 + 운영 Supabase live check까지 통과 확인
- [ ] warning 항목을 검토하고 수동 QA 범위에 반영
- [ ] `Curated beginner recipes`, `Beginner recipe guidance`, `Recipe image provenance`, `Ingredient catalog coverage` PASS 확인
- [ ] `iOS Capacitor config`, `iOS Info.plist`, `iOS SPM package`, `Runtime app config` PASS 확인
- [ ] `Android manifest`, `Android Capacitor config`, `Android release identity`, `Android upload signing` PASS 확인
- [ ] `Supabase release contract check`에서 required tables/RLS/policies/partner_links 권한 PASS 확인
- [ ] `pnpm check:ios-release` 실행: iOS archive bundle id/team/version/build, export options, IPA 크기/SHA-256, archive와 IPA freshness 확인
- [ ] `pnpm check:android-release` 실행: Android release AAB 크기/SHA-256/서명 상태 확인
- [ ] `pnpm check:supabase-live` 실행: 운영 Supabase REST에서 `recipes`, `recipe_sources`, `partner_links`, `ingredients`, `shopping_items` 조회 가능 확인
- [ ] `SUPABASE_LIVE_WRITE_TEST=1 pnpm check:supabase-live` 실행: 임시 재료 insert/read/isolation/delete로 guest `device_id` RLS 확인
- [ ] `pnpm release:goal-check` 실행: 목표 전체 완료 여부 확인. 차단 항목이 있으면 목표 완료로 표시하지 않음
- [ ] `pnpm release:submit-gate` 실행: 로컬/보안/외부/목표 완료 게이트가 모두 PASS인지 확인. 하나라도 BLOCKED면 App Store 심사 제출 또는 Play production 제출 금지
- [ ] `pnpm release:appstore-external-status` 실행: Play Console 상태와 분리해 iOS 실기기 QA 및 App Store Connect/TestFlight 차단만 확인
- [ ] `pnpm release:appstore-submit-gate` 실행: App Store 심사 제출 직전 iOS 산출물, 보안, 운영 API, iOS 실기기 QA, App Store Connect 상태만 따로 확인. 하나라도 BLOCKED면 App Store 심사 제출 금지
- [ ] `pnpm release:playstore-external-status` 실행: App Store Connect 상태와 분리해 Android 실기기 QA 및 Play Console 내부 테스트 차단만 확인
- [ ] `pnpm release:playstore-submit-gate` 실행: Play production 제출 직전 Android 산출물, 보안, 운영 API, Android 실기기 QA, Play Console 상태만 따로 확인. 하나라도 BLOCKED면 Play production 제출 금지
- [ ] `pnpm release:unblock-runbook` 실행: 실기기, App Store Connect, Play Console 차단 해제 후 실행 순서 확인
- [ ] `pnpm release:store-api-runbook` 실행: App Store Connect API / Google Play Developer API credential 설정 절차와 secret 보관 원칙 확인
- [ ] `pnpm release:capture-operator-handoff` 실행: 외부 상태, 실기기 packet, 스토어 console packet, store submission packet, goal 상태를 묶은 operator handoff 생성
- [ ] `pnpm check:real-device-availability` 실행: iOS/Android 실제 기기 연결 확인
- [ ] `pnpm check:real-device-qa-evidence` 실행: `docs/real-device-qa.md`의 iOS/Android 실기기 QA 증거가 모두 confirmed인지 확인
- [ ] `pnpm release:capture-real-device-qa` 실행: 연결된 실기기 상태, 설치 여부, native artifact inventory, device unblock checklist, 수동 QA 템플릿 캡처
- [ ] `pnpm release:capture-store-console` 실행: App Store Connect/TestFlight 및 Play Console 내부 테스트 확인 결과, operator checklist, 문서 반영 템플릿 캡처

## 2. 실기기 QA

로컬 게이트는 앱스토어 심사 계정, OAuth 콘솔 설정, 로컬 알림 수신, 실제 구매 링크 이동을 대신 검증하지 않습니다. 아래 항목은 iOS/Android 실기기에서 계속 수동으로 확인합니다.

완료 후 `docs/real-device-qa.md`에 기기명, 빌드 번호, 스크린샷/로그 경로, 확인 시각을 남기고 `pnpm check:real-device-qa-evidence`를 통과시킵니다.

### 로그인
- [ ] Google 로그인 성공
- [ ] Apple 로그인 성공
- [ ] Kakao 로그인 성공 (운영 플래그가 켜진 경우)
- [ ] 로그인 후 마이페이지 진입
- [ ] 로그아웃 후 상태 정상 복귀

### 로컬 알림
- [ ] iOS 실기기에서 유통기한 D-3, D-1, 당일 알림 예약 확인
- [ ] 알림 권한 거부 시 앱이 오류 없이 설정 상태를 안내하는지 확인
- [ ] 재예약 시 기존 pending 알림이 중복으로 남지 않는지 확인

### 핵심 사용자 흐름
- [ ] 냉장고 재료 추가/수정/삭제
- [ ] 내 재료 기반 추천 레시피 노출
- [ ] 레시피 상세 → 부족 재료 확인
- [ ] 부족 재료 → 장보기 추가
- [ ] 쿠팡 검색 링크 이동

### 삭제 요청
- [ ] 사용자 계정으로 `/account-delete` 요청 생성
- [ ] 운영자 계정으로 `/admin/account-deletions` 목록 확인
- [ ] 상태 변경 (`requested -> reviewing -> completed`)

## 3. App Store Connect

- [ ] Xcode archive의 build number가 `ios/App/App.xcodeproj`의 `CURRENT_PROJECT_VERSION`과 일치
- [ ] `pnpm check:ios-release`에서 archive build number / IPA freshness PASS
- [ ] 앱 설명/프로모션 문구 입력
- [ ] 지원 URL / 개인정보처리방침 URL 입력
- [ ] 리뷰 메모 입력
- [ ] 스크린샷 업로드
- [ ] `docs/app-store-screenshots/2026-05-19-iphone69`의 1290x2796 PNG 5장 업로드
- [ ] 가격/배포 지역 설정
- [ ] App Privacy 문항 입력

## 4. 운영 환경변수

Current Vercel Production confirmation: pass again on 2026-05-21 21:42 KST. `pnpm check:vercel-production-env`, `pnpm check:production-family-route`, and `pnpm check:production-account-deletion-route` passed against `https://jipbab-note-app.vercel.app`.

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ADMIN_EMAILS`
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL`
- [ ] `CAPACITOR_SERVER_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS`
- [ ] `NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED`
- [ ] `NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED`
- [ ] `NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED`
- [ ] `MFDS_API_KEY` (선택이지만 권장)

## 5. Google Play Console

- [ ] Android 런처 앱 이름이 `집밥노트`로 표시되는지 확인
- [ ] 패키지명 `com.jipbab.note`, `versionName 1.0`, `versionCode 1` 확인
- [ ] JDK 21과 Android SDK 경로로 `./gradlew assembleDebug` 또는 release AAB build 통과 확인
- [ ] `ANDROID_UPLOAD_KEYSTORE_PATH`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD` 설정
- [ ] 기존 upload key가 없으면 `pnpm android:upload-key:create` 실행 후 `.release-secrets/android-upload.jks`와 `.env.android-signing.local`을 안전하게 백업
- [ ] `pnpm android:bundle-release` 실행
- [ ] `pnpm check:android-release` 실행: release AAB 존재, 파일 크기, SHA-256, 서명 상태 확인
- [ ] `jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab`에서 AAB 서명 검증
- [ ] `docs/play-store-metadata-ko.md` 기준으로 짧은 설명/전체 설명 입력
- [ ] `docs/play-store-assets/phone`의 1080x1920 JPG 5장 업로드
- [ ] `docs/play-store-assets/feature-graphic.png` 기능 그래픽 업로드
- [ ] 데이터 보안 문항 입력: 이메일/앱 활동/기기 ID/알림 사용 범위 확인
- [ ] 개인정보 처리방침 URL 및 지원 URL 입력
- [ ] 콘텐츠 등급 설문 완료
- [ ] 내부 테스트 트랙에 AAB 업로드
- [ ] Android 실기기에서 로그인, 로컬 알림, 장보기 링크, 계정 삭제 요청 QA
- [ ] Android emulator가 흰 화면이면 DNS 문제 여부 확인: `adb shell ping -c 1 jipbab-note-app.vercel.app`
- [ ] emulator DNS 실패 시 `-dns-server 8.8.8.8,1.1.1.1` 옵션으로 재부팅 후 Home/장보기 화면 캡처

## 6. 사진 / 레시피 품질

- [ ] 새 재료 이미지는 `public/images/ingredients/SOURCES.md`에 생성/출처 기록
- [ ] 새 레시피 이미지는 `public/images/recipes/SOURCES.md`에 생성/출처 기록
- [ ] 경쟁 앱·블로그·쇼핑몰·SNS 이미지를 복사하지 않았는지 확인
- [ ] 대표 레시피는 재료량, 초보자 팁, 눈으로 확인할 조리 상태를 포함
- [ ] `1큰술`, `1작은술`, `1컵`, `한줌` 기준이 설정 화면과 레시피 상세에 노출되는지 확인
- [ ] `pnpm release:check`에서 큐레이션 레시피 20개 이상, 전용 이미지 20장 이상, 재료 카탈로그 160개 이상이 PASS인지 확인

## 7. 보안 / 운영 주의

- [ ] `.env.local` 커밋 금지
- [ ] DB 비밀번호 새 값 운영 문서 저장
- [ ] 운영자 이메일 allowlist 확인
- [ ] 삭제 요청 실제 처리 절차 문서화
- [ ] 운영 로그/텔레메트리에서 이메일, 토큰, 세션, 서비스 키 등 민감정보 redaction 확인
- [ ] analytics 이벤트는 개인정보 최소 수집 원칙과 사용자 식별자 정책 확인 후 활성화
- [ ] crash reporting 도입 전 수집 항목, 보관 기간, 사용자 고지 문구 확인
- [ ] 보안 모니터링 알림 기준 정의: 비정상 API 오류율, 권한 거부 급증, 관리자 기능 실패
- [ ] `pnpm check:supabase-release` 통과: 출시 필수 테이블, RLS, ownership policy, service_role policy, `partner_links` read-only 권한 확인
- [ ] 운영 Supabase에서 `supabase/migrations/20260228001000_verify_rls.sql` 또는 동등한 SQL 검증 실행: 다른 `device_id`/`user_id` 데이터 조회·수정·삭제 거부
- [ ] 운영 알림 담당자와 장애/보안 이벤트 triage 경로 지정

## 8. 수동 잔여 리스크

| 리스크 | 영향 | 담당 | 완료 기준 | 기한 |
| --- | --- | --- | --- | --- |
| 실기기 로그인 QA | OAuth 콘솔/기기 쿠키/앱 심사 계정 문제는 로컬 빌드로 검증 불가 | 앱 운영자 | iOS/Android 실기기에서 Google, Apple, Kakao 로그인 확인 | 스토어 제출 전 |
| 로컬 알림 QA | 알림 권한과 예약/수신 동작은 브라우저/빌드만으로 검증 불가 | 앱 운영자 | 권한 허용/거부, D-3/D-1/당일 예약과 재예약 중복 방지 확인 | 스토어 제출 전 |
| App Store/Play Console 입력 | 개인정보 문항, 스크린샷, 심사 메모는 콘솔에서만 완료 가능 | 앱 운영자 | 각 콘솔 저장 및 내부 테스트 빌드 연결 확인 | 스토어 제출 전 |
| 외부 provider 대시보드 | Supabase/Google/Apple/Kakao redirect와 권한 설정은 로컬 코드로 강제 불가 | 앱 운영자 | 운영 도메인 redirect URL, OAuth 앱 상태, Supabase Auth provider 확인 | 스토어 제출 전 |
| MFDS/파트너 링크 운영 키 | 키가 없으면 앱은 fallback으로 동작하지만 데이터/수익화 품질이 낮아짐 | 앱 운영자 | `pnpm release:check` warning 해소 또는 fallback 출시 결정 기록 | 출시 전 의사결정 |

## 8-1. 목표 완료 판정

아래 명령은 현재 장부 기준으로 “이 목표를 완료라고 말할 수 있는가”를 보수적으로 판정합니다.

```bash
pnpm release:goal-check
```

- [ ] `핵심 루프` PASS
- [ ] `Supabase 로컬 RLS/스키마 계약` PASS
- [ ] `로컬모드/동기화 안정성` PASS
- [ ] `운영 Supabase live/read/write/RLS` PASS
- [ ] `OAuth/로그인/데이터 이전` PASS
- [ ] `모바일 시뮬레이터/에뮬레이터 QA` PASS
- [ ] `실기기 QA` PASS
- [ ] `정책/스토어 문서` PASS
- [ ] `App Store Connect/TestFlight` PASS
- [ ] `Play Console 내부 테스트` PASS

하나라도 `BLOCKED` 또는 `MISSING`이면 활성 goal은 완료 처리하지 않습니다.

## 9. 출시 후 검토

- [ ] 온디바이스 LLM 다운로드/실행 PoC
- [ ] iPhone 실기기에서 Gemma 2B/E2B 계열 성능 측정
- [ ] 모델 저장공간/삭제 UI 설계
