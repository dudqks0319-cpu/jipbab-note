# 집밥노트 출시 직전 체크리스트

## 1. 로컬 출시 게이트

아래 명령은 필수 운영 환경변수, OAuth 제공자 플래그, 지원 이메일, Capacitor 서버 URL, 핵심 라우트 파일 존재 여부를 로컬에서 결정적으로 확인합니다. 환경변수 값은 출력하지 않고 누락/설정 상태만 표시합니다.

```bash
pnpm release:check
```

- [ ] `pnpm release:check` 실행
- [ ] hard blocker 0개 확인
- [ ] warning 항목을 검토하고 수동 QA 범위에 반영

## 2. 실기기 QA

로컬 게이트는 앱스토어 심사 계정, OAuth 콘솔 설정, 카메라 권한, 바코드 스캔, 실제 구매 링크 이동을 대신 검증하지 않습니다. 아래 항목은 iOS/Android 실기기에서 계속 수동으로 확인합니다.

### 로그인
- [ ] Google 로그인 성공
- [ ] Apple 로그인 성공
- [ ] Kakao 로그인 성공 (운영 플래그가 켜진 경우)
- [ ] 로그인 후 마이페이지 진입
- [ ] 로그아웃 후 상태 정상 복귀

### 카메라 / 바코드
- [ ] 카메라 권한 허용 후 바코드 스캔 성공
- [ ] 카메라 권한 거부 후 수동 입력 fallback 확인
- [ ] 미지원 환경에서 수동 입력 fallback 확인

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

## 5. 보안 / 운영 주의

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

## 6. 출시 후 검토

- [ ] 온디바이스 LLM 다운로드/실행 PoC
- [ ] iPhone 실기기에서 Gemma 2B/E2B 계열 성능 측정
- [ ] 모델 저장공간/삭제 UI 설계
