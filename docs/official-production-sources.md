# 집밥노트 공식 원본·배포 연결 기준

Updated: 2026-07-11 KST
Status: `Preview source aligned / Production NO-GO`

이 문서는 GitHub, Vercel Preview, Vercel Production의 역할을 하나의 운영 기준으로 고정합니다. `READY`는 배포 빌드 성공만 뜻하며 제품 출시 승인을 뜻하지 않습니다.

## 공식 원본

| 역할 | 공식 값 | 현재 판정 |
|---|---|---|
| GitHub 저장소 | `dudqks0319-cpu/jipbab-note` | 공식 원본 |
| Release branch | `ux/home-today-action-v2` | Phase 6 작업 브랜치 |
| 계획서 기준 GitHub HEAD | `a96e69d589f0c587267e400d115e3333fd6c059a` | 로컬 checkout과 일치 확인 |
| 공식 Preview 프로젝트 | `youngbeens-projects/jipbab-note` | Git Integration Preview 전용 |
| 공식 Preview deployment | `dpl_9Zz3Zj9N5Van8reEfFc9gyVbBmHb` | `READY` |
| 공식 Preview source | `git` | 통과 |
| 공식 Preview Git SHA | `a96e69d589f0c587267e400d115e3333fd6c059a` | GitHub HEAD와 일치 |
| Production 프로젝트 | `youngbeens-projects/jipbab-note-app` | Production 전용으로 유지 |
| Production alias | `https://jipbab-note-app.vercel.app` | 기존 배포 유지 |
| Production 승격 | `false` | 계속 금지 |

현재 작업 트리의 Phase 6.1 변경은 `a96e69d`를 기반으로 한 로컬 변경이며 아직 Git commit이나 Vercel 배포가 아닙니다. 다음 공식 Preview는 변경을 commit한 뒤 그 Git SHA와 Vercel `githubCommitSha`가 정확히 같을 때만 새 기준으로 기록합니다.

## 과거 Preview의 역할

| 배포 | 프로젝트/방식 | 역할 |
|---|---|---|
| `dpl_BwNQjXMxLJyt3ev41Dp3JDFaefGT` | `jipbab-note-app`, CLI Preview | Phase 6 음성 경로 12/12의 과거 증거 |
| `https://jipbab-note-qg1qr7uz5-youngbeens-projects.vercel.app` | 위 CLI Preview URL | 공식 최신 Preview로 사용하지 않음 |

CLI Preview는 긴급 진단이나 과거 증거에만 사용합니다. 릴리스 후보의 공식 원본 추적은 `jipbab-note` 프로젝트의 Git Integration 배포만 사용합니다.

## 배포 정책

1. PR·branch Preview는 `jipbab-note` 프로젝트에서 Git Integration으로 생성합니다.
2. Preview 승인 전 GitHub commit SHA, Vercel `githubCommitSha`, 저장소, 브랜치, `READY` 상태를 함께 확인합니다.
3. `jipbab-note-app`은 Production alias를 유지하는 프로젝트로만 취급합니다.
4. CLI로 만든 배포는 공식 릴리스 후보가 아니며 Production 승격 근거로 사용하지 않습니다.
5. Full happy path, DB migration/backup/rollback, HMAC secret, 실제 모바일, 핵심 20개 사람 검수가 모두 끝나기 전 Production을 승격하지 않습니다.

## 데이터베이스 상태

2026-07-10 운영 감사에서 Supabase ref `xqelabiwtjntwrjqcteo`의 migration history와 로컬 migration 목록이 일치하지 않았습니다. 이번 Phase 6.1에서는 운영 DB, secret, alias를 변경하지 않았습니다.

- `supabase db push` 금지
- 운영 migration 적용 금지
- 운영 fixture 삽입 금지
- backup과 rollback rehearsal 전 schema 변경 금지
- 기술 E2E fixture를 사람 검수 또는 공개 승인 통계에 포함 금지

관련 차단 상태는 [현재 출시 상태](./current-release-state.md)와 `release-ledger.yaml`을 기준으로 관리합니다.
