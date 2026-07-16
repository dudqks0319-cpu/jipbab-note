# PR #9 통합 범위·대용량 자산 안전 계획

Updated: 2026-07-16 KST  
Branch: `agent/sync-ux-release`  
Target: protected `main`  

## 결론

PR #9는 런타임·DB·모바일·출시 문서와 대량 이미지가 한 번에 누적된 통합 PR이다. 현재 운영 배포는 검증됐지만, 이 범위를 그대로 일반적인 코드 리뷰로 승인하기에는 크다. 기존 이미지를 즉시 삭제하거나 Git 이력을 재작성하지 않고 다음 두 단계를 적용한다.

1. 현재 이미지 기준선을 CI에서 동결해 추가 비용 증가를 막는다.
2. 실제 사용자 화면 참조와 출시 증거 의존성을 만든 뒤 별도 자산 최적화 PR에서 안전하게 축소한다.

## 현재 정량 상태

- `origin/main...HEAD` 변경 파일: 2,599개
- `public/images/**` 변경 파일: 2,246개
- 변경 bitmap: 834개
- 변경 SVG: 1,408개
- 현재 `public/images` 파일: 2,418개
- 현재 `public/images` 실제 바이트: 1,490,331,543 bytes
- PR의 binary numstat 항목: 834개
- 추적 중인 `ios/App/CapApp-SPM/.build/**`: 0개

큰 디렉터리:

| 경로 | 파일 | 디스크 사용량 | 현재 판정 |
|---|---:|---:|---|
| `beginner-recipe-guides` | 528 | 약 803MB | 데이터·단계 경로 참조가 있어 즉시 삭제 금지, 최우선 최적화 후보 |
| `beginner-imagegen-posters` | 120 | 약 166MB | 공개 썸네일은 아니지만 테스트·출시 증거 참조가 있어 분리 검토 |
| `generated` | 57 | 약 130MB | 일부 레시피 이미지 후보, 참조별 유지 판단 필요 |
| `beginner-food-photos` | 111 | 약 109MB | 실제 사용자 썸네일 참조, 유지하되 압축 검토 |
| `jipbab-curated` | 다수 | 약 33MB | 홈·상세·데모의 실제 사용자 경로 참조, 우선 유지 |

## 즉시 적용한 보호

`pnpm check:asset-budget`은 Git에 추적된 파일만 검사한다.

- `public/images` 2,420개 초과 차단
- 총 1.5GB 초과 차단
- 단일 이미지 7MB 초과 차단
- `.build`, `.next`, `node_modules` 생성물 추적 차단
- CI-safe 출시 게이트에 연결

이 기준은 현재 저장소가 가볍다는 뜻이 아니다. 현재 큰 기준선을 더 키우지 못하게 동결한 것이다.

## 안전한 축소 순서

### 1. 참조 manifest 생성

- TypeScript·SQL·JSON·CSV·Markdown의 `/images/...` 경로를 수집한다.
- 홈, 목록, 상세, 조리 모드, App Store 데모, E2E와 출시 증거를 소비자별로 표시한다.
- 동적 경로와 glob 경로는 별도로 표시해 단순 문자열 검색으로 삭제하지 않는다.

### 2. 자산 등급화

- A: 현재 운영 UI에서 직접 사용
- B: 핵심 20개·스토어 제출·회귀 테스트에서 필요
- C: 생성 원본 또는 향후 후보지만 운영 UI에서 사용하지 않음
- D: 중복·잘못된 음식·권리 미확인·도달 불가

삭제는 D 등급에서만 수행하고, C 등급은 외부 object storage나 별도 artifact 저장소 이동을 먼저 검토한다.

### 3. 비파괴 최적화

- 동일 경로에서 무손실 PNG 최적화를 먼저 적용한다.
- 크기 변경 시 360/390/430px 시각 회귀와 이미지 HTTP 200을 확인한다.
- WebP/AVIF 전환은 앱·Capacitor·출시 증거 경로를 함께 바꾸는 별도 PR로 진행한다.
- 이미지 권리·출처 ledger와 실제 파일 checksum을 유지한다.

### 4. PR 분리

- Runtime/DB/Security PR: 코드, migration, rollback, 테스트, 최소 운영 자산
- Content/Asset PR: 레시피 문장, 사진, 출처 ledger, 사람 검수 증거
- Store/Mobile PR: iOS·Android 설정, 제출 packet, 실기기 증거

기존 PR #9의 이력을 강제로 재작성하지 않는다. 새 통합 브랜치나 후속 PR을 만들 때 위 범위를 사용한다.

## 완료 기준

- [x] 현재 대용량 기준선 정량화
- [x] 신규 이미지 수·총 바이트·단일 파일 크기 CI 제한
- [x] generated build artifact 추적 차단
- [ ] 전체 이미지 소비자 manifest
- [ ] 미참조·중복 자산 목록과 권리 상태
- [ ] 운영 UI 자산 100% HTTP 200
- [ ] 최적화 전후 모바일 시각 회귀
- [ ] 자산 PR과 runtime PR 분리
- [ ] Git 이력 축소가 필요하면 별도 백업·승인·복제 검증

## 금지 사항

- 참조 manifest 없이 대량 이미지 삭제
- `git reset --hard`, 강제 push, 무승인 history rewrite
- 실제 음식 사진을 CSS/SVG/emoji placeholder로 대체
- 사람 검수 증거·출처 ledger를 용량 절감 대상으로 삭제
- Preview 성공만으로 App Store·실기기 자산을 사용 완료로 처리
