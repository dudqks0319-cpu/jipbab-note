# 집밥노트 출시 직전 체크리스트

## 1. 로컬 출시 게이트

아래 명령은 필수 운영 환경변수, OAuth 제공자 플래그, 지원 이메일, Capacitor 서버 URL, 핵심 라우트 파일 존재 여부, 스토어 문서, 초보자 큐레이션 레시피 품질, 전용 레시피 이미지, 이미지 출처 문서, 재료 카탈로그 규모를 로컬에서 결정적으로 확인합니다. 환경변수 값은 출력하지 않고 누락/설정 상태만 표시합니다.

```bash
pnpm release:check
```

- [ ] `pnpm release:check` 실행
- [ ] hard blocker 0개 확인
- [ ] warning 항목을 검토하고 수동 QA 범위에 반영
- [ ] `Curated beginner recipes`, `Beginner recipe guidance`, `Recipe image provenance`, `Ingredient catalog coverage` PASS 확인

## 2. 실기기 QA

로컬 게이트는 앱스토어 심사 계정, OAuth 콘솔 설정, 로컬 알림 수신, 실제 구매 링크 이동을 대신 검증하지 않습니다. 아래 항목은 iOS/Android 실기기에서 계속 수동으로 확인합니다.

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

- [ ] 앱 설명/프로모션 문구 입력
- [ ] 지원 URL / 개인정보처리방침 URL 입력
- [ ] 리뷰 메모 입력
- [ ] 스크린샷 업로드
- [ ] 가격/배포 지역 설정
- [ ] App Privacy 문항 입력

## 4. 운영 환경변수

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
- [ ] `docs/play-store-metadata-ko.md` 기준으로 짧은 설명/전체 설명 입력
- [ ] 데이터 보안 문항 입력: 이메일/앱 활동/기기 ID/알림 사용 범위 확인
- [ ] 개인정보 처리방침 URL 및 지원 URL 입력
- [ ] 콘텐츠 등급 설문 완료
- [ ] 내부 테스트 트랙에 AAB 업로드
- [ ] Android 실기기에서 로그인, 로컬 알림, 장보기 링크, 계정 삭제 요청 QA

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
- [ ] RLS negative-path 테스트 확인: 다른 `device_id`/`user_id` 데이터 조회·수정·삭제 거부
- [ ] 운영 알림 담당자와 장애/보안 이벤트 triage 경로 지정

## 8. 수동 잔여 리스크

| 리스크 | 영향 | 담당 | 완료 기준 | 기한 |
| --- | --- | --- | --- | --- |
| 실기기 로그인 QA | OAuth 콘솔/기기 쿠키/앱 심사 계정 문제는 로컬 빌드로 검증 불가 | 앱 운영자 | iOS/Android 실기기에서 Google, Apple, Kakao 로그인 확인 | 스토어 제출 전 |
| 로컬 알림 QA | 알림 권한과 예약/수신 동작은 브라우저/빌드만으로 검증 불가 | 앱 운영자 | 권한 허용/거부, D-3/D-1/당일 예약과 재예약 중복 방지 확인 | 스토어 제출 전 |
| App Store/Play Console 입력 | 개인정보 문항, 스크린샷, 심사 메모는 콘솔에서만 완료 가능 | 앱 운영자 | 각 콘솔 저장 및 내부 테스트 빌드 연결 확인 | 스토어 제출 전 |
| 외부 provider 대시보드 | Supabase/Google/Apple/Kakao redirect와 권한 설정은 로컬 코드로 강제 불가 | 앱 운영자 | 운영 도메인 redirect URL, OAuth 앱 상태, Supabase Auth provider 확인 | 스토어 제출 전 |
| MFDS/파트너 링크 운영 키 | 키가 없으면 앱은 fallback으로 동작하지만 데이터/수익화 품질이 낮아짐 | 앱 운영자 | `pnpm release:check` warning 해소 또는 fallback 출시 결정 기록 | 출시 전 의사결정 |

## 9. 출시 후 검토

- [ ] 온디바이스 LLM 다운로드/실행 PoC
- [ ] iPhone 실기기에서 Gemma 2B/E2B 계열 성능 측정
- [ ] 모델 저장공간/삭제 UI 설계
