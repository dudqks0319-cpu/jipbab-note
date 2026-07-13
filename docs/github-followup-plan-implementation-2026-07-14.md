# GitHub 후속 보완 계획 구현 보고서

Updated: 2026-07-14 KST
Branch: `integration/phase6-release-candidate`

## 이번 통합 브랜치에서 완료한 항목

- CI·거버넌스: 공식 통합 브랜치, 최신 HEAD Actions, required checks, branch protection, 중복 PR 정리
- full happy path: Production build + `next start`, HttpOnly fixture session, Production fixture 차단, artifact redaction, 기술 fixture 분석 제외
- 모바일 증거: 홈·레시피 목록·상세 장보기·조리 화면을 360/390/430px로 캡처하고 12개 화면 크기를 검사
- 핵심 20개: 대체 제목 후보 4개를 정확한 메뉴 데이터와 메뉴별 이미지로 교체하고 자동 품질 점수 90점 이상 20/20 달성
- 영유아식 연구: 24개 후보를 공통 recipe v2 연구 모델로 변환하고 공개 경로 없이 비운영 관리자 플래그 뒤에 격리
- 제품 분석: 33개 표준 이벤트 매핑, 명시적 동의·철회 UI, 기술 fixture 제외, 실제 냉장고·추천·레시피·조리·장보기 동작 배선
- 성능: 기존 LCP/CLS/상호작용 예산에 TTFB, transfer, JS, 이미지, 요청 수, long task, hydration 회귀 계약 추가
- 실제 데이터 성능: 공개 레시피 UUID를 요구하고 카드 12개·장보기 20개·상세·인분·조리·타이머·가족·콜백·앱 정보를 모두 확인하는 release-candidate 프로필 추가
- 성능 기준선 운영: 측정 배포의 전체 Git SHA를 필수화하고, cold·warm 각 5회·9개 화면·median/p75/max/표준편차/실패율·절대 예산·runtime 오류 0건을 재검사한 검토 승인 명령만 집계 baseline을 갱신하도록 제한
- 저장소 관리: 바이너리 1,064개 inventory, 중복 해시·미참조 후보 보고서, 5MiB 단일 파일 및 release archive Git 추적 차단
- CI 유지보수: `upload-artifact`를 공식 Node.js 24 기반 v6 고정 SHA로 갱신하고 기존 lint 경고 제거

## 검증 결과

- `npm test`: 454/454 통과, lint 경고 0건
- `pnpm build`: 41/41 route 프로덕션 빌드 통과
- `pnpm release:ci-static-check`: 20/20 통과
- `pnpm release:candidate-gate`: 14 통과, 5 차단, 2 누락
- 직전 GitHub Release Gate run `29292411853`: Verification Pipeline과 required marker job 9/9 통과, annotation 0건
- 직전 원격 검증 체크포인트 `81039c495060a8c536103da58385c46fe6f98469`: Vercel Preview deployment 성공, GitHub deployment source SHA 일치
- 모바일 증거: 12/12 통과
- 핵심 20개 정적 감사: 정확한 메뉴 20/20, 로컬 이미지 20/20, 자동 점수 90점 이상 20/20

## 외부 승인·실행이 필요한 잔여 차단

- 승인된 외부 모니터링 벤더와 실제 합성 오류 수신 증거
- iOS·Android 실기기 전체 QA 증거
- Play Console signed AAB 내부 테스트 처리 증거
- 핵심 20개 실제 조리와 초보자·식품 안전·출처·이미지 권리 사람 검수
- App Store Connect/TestFlight 최신 후보 처리와 내부 테스터 가능 증거
- 운영 DB migration history 정합화, 복원 가능한 backup, staging apply/rollback/reapply 증거
- Vercel Preview 보호 해제 또는 승인된 automation bypass, 공개 레시피 UUID·제목과 장보기 20개 상태를 준비한 뒤 populated-data 성능 baseline 채움

후보 게이트는 운영 DB migration·backup·staging·rollback과 출시 후보 실제 데이터 성능 baseline을 독립 차단 항목으로 직접 검사한다. 성능 증거 승격은 `PHASE6_PERFORMANCE_PROMOTION_APPROVED=1 pnpm promote:phase6-performance-baseline`로만 수행하며, 기준선 누락 외 실패가 있으면 중단한다. GitHub SHA와 Preview source SHA 일치는 확인했지만 현재 Preview는 Vercel 인증 화면으로 리디렉션되어 앱 화면의 release-candidate 성능 측정을 실행할 수 없다. 위 항목은 계정·사람·실기기·운영 인프라가 필요한 증거이므로 이 브랜치에서 임의로 완료 처리하지 않는다. 모든 외부 게이트가 통과하기 전에는 Production 승격, 운영 migration, 스토어 제출을 진행하지 않는다.

요구사항별 완료·차단 근거는 `docs/github-followup-plan-completion-audit-2026-07-14.md`에 유지한다. `main` 반영과 release tag는 최종 외부 게이트 통과 후 별도 승격 승인 대상으로 남긴다.
