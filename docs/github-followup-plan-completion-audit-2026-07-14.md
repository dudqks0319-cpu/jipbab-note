# GitHub 후속 보완 계획 완료 감사

Updated: 2026-07-14 KST
Target branch: `integration/phase6-release-candidate`

이 문서는 `집밥노트 최신 GitHub 기준 후속 보완·개선 통합 계획서`의 Phase A~H와 최종 Definition of Done을 현재 코드·GitHub·Vercel·외부 증거에 대조한 결과다. 정적 계약이나 기술 fixture를 사람·기기·운영 증거로 대체하지 않는다.

## 현재 판정

- 로컬 후보 게이트: `14 PASS / 5 BLOCKED / 2 MISSING`
- GitHub: `main`과 통합 브랜치 모두 strict required checks 8개, 관리자 적용, force-push·삭제 금지
- 최신 통합 브랜치 Release Gate: required job 9/9 성공, annotation 0건
- 최신 통합 브랜치 Vercel Preview: source SHA 일치, deployment `success`
- Production·Supabase 운영 DB·스토어 제출: 변경하지 않음
- 최종 계획 완료: **아님**

## Phase별 증거

| Phase | 판정 | 현재 증거 | 남은 필수 조건 |
| --- | --- | --- | --- |
| A 통합 기준선 | 부분 완료 | 통합 브랜치, Actions trigger, required checks, PR #1·#3 종료, PR #4 분리 댓글, SHA 일치 Preview | `main` 반영과 release tag는 최종 외부 게이트 전 금지 |
| B full happy path | 부분 완료 | HttpOnly fixture session, Production 404, `next build`·`next start`, negative 12/12, happy 23/23, redacted artifact, fixture 분석 제외 | 인증 가능한 실제 Preview remote happy path |
| C 데이터베이스 | 차단 | 로컬 migration·RLS·rollback 계약 | migration history 차이표 승인, 복원 가능한 backup, staging apply→rollback→reapply, API v1 200 |
| D UX | 완료 | Starter·홈·목록·장보기·조리 통합, 기본 필터 3개, 계란·두부 분류, browser confirm 제거, 모바일 증거 12/12 | 실기기 VoiceOver·TalkBack은 Phase H에 포함 |
| E 레시피 | 미완료 | 정확한 핵심 메뉴 20/20, 콘텐츠 SHA 패킷, 자동 점수 20/20 | 실제 조리·초보자·안전·출처·이미지 사람 검수 각각 20/20 |
| F 영유아식 | 부분 완료 | 공통 recipe v2 확장, 관리자 연구 경로, Production·기본 flag OFF, 공개 0 | 전문가·실제 조리·권리·이미지·staging·실기기 증거 |
| G 운영·분석 | 부분 완료 | 구조화 로그, HMAC alert 경계, 33개 runtime 이벤트, 기본 비활성 동의·철회 UI, fixture 분리 | vendor·DPA·retention·owner 승인, synthetic 5xx 실제 수신, 승인된 field dashboard |
| H 모바일·출시 | 차단 | iOS archive/IPA와 과거 App Store 증거, 플랫폼별 gate | iOS/Android 현재 build 실기기 전체 QA, signed AAB, Play internal, 최신 ASC/TestFlight 증거 |

## 성능 계획 대조

- 기존 모바일 profile과 절대 예산을 유지한다.
- Release Candidate는 9개 populated 화면에서 cold 5회와 warm 5회를 각각 측정한다.
- 모드별 median, p75, 최대값, 표준편차, 실패율을 기록한다.
- 전체 transfer, JS, 이미지, 요청 수, total long task와 50ms 이상 long task 수를 회귀 기준으로 검증한다.
- 실제 populated Preview가 인증으로 막혀 있으므로 현재 데모 baseline을 출시 후보 증거로 승격하지 않는다.
- 승인된 `VERCEL_AUTOMATION_BYPASS_SECRET`이 제공되면 캡처기는 해당 `*.vercel.app` origin에만 우회 헤더를 주입하고 다른 origin이나 증거에는 secret을 전달하지 않는다.
- Production field p75는 승인된 RUM·동의·최소 표본이 없어 미검증이다.

## 최종 DoD에서 확인되지 않은 항목

- `main`이 release candidate 포함
- release tag
- Production SHA와 공식 승격 승인
- 운영 Supabase migration history·backup·staging·rollback·API 200
- 핵심 20개 사람 증거 전 항목
- iOS·Android current build, background, offline, OAuth, 알림, 계정 삭제, VoiceOver·TalkBack
- 외부 alert receipt, incident owner, privacy retention, 승인된 field dashboard

위 증거가 모두 생기기 전에는 계획을 완료로 표시하거나 Production·운영 DB·스토어를 변경하지 않는다.
