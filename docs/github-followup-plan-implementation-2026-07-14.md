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
- 저장소 관리: 바이너리 1,064개 inventory, 중복 해시·미참조 후보 보고서, 5MiB 단일 파일 및 release archive Git 추적 차단
- CI 유지보수: `upload-artifact`를 공식 Node.js 24 기반 v6 고정 SHA로 갱신하고 기존 lint 경고 제거

## 검증 결과

- `npm test`: 444/444 통과
- `pnpm build`: 41/41 route 프로덕션 빌드 통과
- `pnpm release:ci-static-check`: 20/20 통과
- `pnpm release:candidate-gate`: 14 통과, 3 차단, 2 누락
- 모바일 증거: 12/12 통과
- 핵심 20개 정적 감사: 정확한 메뉴 20/20, 로컬 이미지 20/20, 자동 점수 90점 이상 20/20

## 외부 승인·실행이 필요한 잔여 차단

- 승인된 외부 모니터링 벤더와 실제 합성 오류 수신 증거
- iOS·Android 실기기 전체 QA 증거
- Play Console signed AAB 내부 테스트 처리 증거
- 핵심 20개 실제 조리와 초보자·식품 안전·출처·이미지 권리 사람 검수
- App Store Connect/TestFlight 최신 후보 처리와 내부 테스터 가능 증거
- 운영 DB migration history 정합화, 복원 가능한 backup, staging apply/rollback/reapply 증거
- GitHub SHA와 새 Vercel Preview SHA 일치 확인 및 populated-data 성능 baseline 채움

위 항목은 계정·사람·실기기·운영 인프라가 필요한 증거이므로 이 브랜치에서 임의로 완료 처리하지 않는다. 모든 외부 게이트가 통과하기 전에는 Production 승격, 운영 migration, 스토어 제출을 진행하지 않는다.
