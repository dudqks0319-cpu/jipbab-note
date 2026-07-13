# Phase 6 브라우저 E2E 보고서

Updated: 2026-07-11 KST

## 결론

Phase 6의 기존 음성 경로 12개와 보호된 기술 fixture의 성공 경로 18개를 실제 Chrome fresh profile에서 자동화했습니다.

- 음성 경로: 로컬·과거 CLI Preview `12/12`
- 기술 fixture happy path: 현재 로컬 작업 트리 `18/18`
- 390px 가로 overflow: `0`
- 390px 보이는 44px 미만 인터랙션: `0`
- 브라우저 console error: `0`
- 취소되지 않은 앱 요청 실패·HTTP 4xx/5xx·외부 resource 실패: 각각 `0`
- 기술 fixture의 사람 검수 집계: `false`
- Production 승격: `false`

이 결과는 애플리케이션 계층의 전체 연결과 회귀를 검증합니다. 실제 staging DB recipe v2, 인증 성공 경로, 실제 모바일, 핵심 20개 사람 검수는 아직 완료되지 않았으므로 공개 베타와 Production은 계속 차단합니다.

## 성공 경로 18개

`pnpm capture:phase6-e2e-happy`는 다음을 검증합니다.

1. fresh guest에서 계란·두부 선택과 저장
2. 승인된 기술 fixture 추천 노출
3. 추천 API `200`과 고정 fixture UUID 확인
4. 레시피 상세 진입
5. 인분 변경과 계량 표시 변경
6. 필수 부족 재료 1개 확인
7. 부족 재료 장보기 추가
8. 같은 재료 재입력과 수량 병합
9. 조리 모드 시작
10. 30초 타이머 시작·일시정지
11. 새로고침 후 타이머 복원
12. 1분 30초 타이머 시작·일시정지
13. 이전 단계 이동
14. 3단계 조리 완료
15. 난이도 피드백 저장
16. 사용 재료 2개 소진 처리
17. 재접속 후 완료·피드백 복원
18. 390px 44px/overflow 검사와 390px·1280px screenshot 생성

실행 결과 JSON에는 `isTestFixture=true`, `humanReviewCounted=false`를 함께 기록합니다.

## 기존 음성 경로 12개

`pnpm capture:phase6-e2e-negative`는 다음을 검증합니다.

- fresh guest starter 표시
- 계란·두부 저장
- 미승인 추천 fail-closed
- reload 후 재료 복원
- 검색 URL 복원
- 미승인 목록 fail-closed
- 잘못된 상세 fail-closed
- demo 홈 `/api/v1/*` 요청 0건
- demo 목록 `/api/v1/*` 요청 0건
- 잘못된 family token `401`
- 잘못된 merge token `401`
- 잘못된 계정 삭제 확인 문구 `400`

## fixture 보안 경계

fixture는 `APP_ENV=staging`, 명시적 enable flag, 12자 이상 임의 서버 검증 문자열, `x-phase6-e2e-fixture` header를 모두 요구합니다. `APP_ENV=production` 또는 `VERCEL_ENV=production`에서는 항상 차단됩니다.

- 고정 UUID namespace
- `isTestFixture=true`
- 실제 DB row를 만들지 않음
- Production 목록·추천·상세에서 사용 금지
- 사람 검수 CSV·출시 통계에서 제외
- 기술 fixture 상세에서는 실제 공개 댓글 API를 호출하지 않음

세부 운영 기준은 [phase-6-staging-fixture.md](./phase-6-staging-fixture.md)를 따릅니다.

## 실행기와 CI

- `CHROME_PATH` 명시 지원
- macOS Chrome, Chrome for Testing 자동 탐색
- Linux Chrome/Chromium 자동 탐색
- Windows 경로 탐색
- 마케팅 문구 대신 `data-testid` 사용
- console·network log 수집
- 앱 요청·취소 요청·외부 resource 실패를 분리하고 앱 오류를 fail 조건으로 처리
- 결과·접근성 JSON 생성
- mobile 390px·desktop 1280px screenshot 생성
- GitHub Actions runtime E2E 실행
- PR artifact 14일, 수동 release candidate artifact 90일 보존

정적 계약은 `11/11`이며 release/CI-safe gate에 연결돼 있습니다.

Pretendard CDN 런타임 의존은 제거하고 한국어 시스템 폰트 스택을 사용해, headless Chrome과 WebView에서 제3자 폰트 네트워크 실패 없이 동작합니다.

## 증거 파일

`output/ui-evidence`에 다음 ignored artifact를 생성합니다.

- `phase6-e2e-guest-negative-390.png`
- `phase6-e2e-mobile-390.png`
- `phase6-e2e-desktop-1280.png`
- `phase6-network-log.json`
- `phase6-console-log.json`
- `phase6-e2e-result.json`
- `phase6-accessibility-summary.json`

## 배포 증거 구분

- 과거 CLI Preview `dpl_BwNQjXMxLJyt3ev41Dp3JDFaefGT`는 음성 경로 12/12 증거입니다.
- GitHub HEAD `a96e69d589f0c587267e400d115e3333fd6c059a`와 연결된 공식 Git Preview는 `dpl_9Zz3Zj9N5Van8reEfFc9gyVbBmHb`입니다.
- 현재 Phase 6.1 happy-path·UX 변경은 위 SHA를 기반으로 한 로컬 작업 트리이며 아직 새 Git Preview에 배포하지 않았습니다.
- Production alias `https://jipbab-note-app.vercel.app`는 승격하지 않았습니다.

## 아직 완료되지 않은 경로

- DB 기반 staging recipe v2와 API v1 200 성공 경로
- 실제 staging 로그인, guest merge, 가족 생성·참여·공유
- 최근 인증을 포함한 계정 삭제 성공 경로
- 오프라인 조리 저장과 복구 후 동기화
- iOS·Android background/잠금/종료 후 타이머 복원
- Capacitor 실제 기기 알림·진동·사운드
- 핵심 20개 실제 조리·초보자·안전·출처·이미지 권리 검수
- migration history 정리, backup, staging 적용, rollback rehearsal
- Production HMAC secret과 API v1 200 확인

따라서 현재 판정은 `기술 fixture happy path PASS / 제품 출시 NO-GO`입니다.

## 최종 로컬 검증

| 검증 | 결과 |
|---|---|
| `npm test` | lint·TypeScript·unit `391/391` PASS |
| `pnpm test:integration` | publication 0개 노출·signed-session 음성 경로 PASS |
| `pnpm test:content` | 176 recipe validation·186 beginner guidance·Phase 1/5 계약 PASS |
| `pnpm check:phase6-e2e-contract` | `11/11` PASS |
| `pnpm capture:phase6-e2e-negative` | `12/12` PASS |
| `pnpm capture:phase6-e2e-happy` | `18/18` PASS, `humanReviewCounted=false` |
| `pnpm build` | compile·TypeScript·`38/38` routes PASS |
| `pnpm release:ci-static-check` | `14/14` PASS, dependency moderate 이상 0건 |
| `pnpm release:check` | 10개 그룹 PASS, 4개 출시 그룹 BLOCKED |

차단된 4개 그룹은 Phase 5 사람 증거, 로컬 release env와 Capacitor 생성물, iOS archive/IPA, Android AAB입니다. 이 차단은 해제하지 않았고 Production 승격 근거로 사용하지 않습니다.
