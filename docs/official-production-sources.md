# 집밥노트 공식 원본·운영 연결 기준

Audited: 2026-07-15 KST
Status: `runtime hotfix aligned; Git source mismatch open`

이 문서는 현재 파일, GitHub, Vercel, Supabase의 실측값을 분리해 기록한다. 외부 설정을 바꾸기 전까지 “권장 공식 원본”과 “현재 실제 운영 연결”은 같은 것으로 표시하지 않는다.

## 현재 확인된 사실

| 표면 | 현재 값 | 판정 |
|---|---|---|
| 권장 canonical GitHub 저장소 | `dudqks0319-cpu/jipbab-note` | 현재 `origin`, 최신 production SHA 보유 |
| GitHub 기본 브랜치 | `main` @ `86e2bc2` | 현재 hotfix branch보다 뒤 |
| 현재 hotfix branch | `agent/sync-ux-release` @ `c7fbbbfd2698dec5741ad04e9432ddeee75b58b4` | `origin`과 동기화 |
| Vercel 프로젝트 | `youngbeens-projects/jipbab-note-app` | active production project |
| Vercel Git 연결 | private `dudqks0319-cpu/jipbab-note-app`, branch `main` | canonical 후보와 불일치 |
| 현재 production deployment | `dpl_Ff1Rqm7ovh1mSAuTKWwjvZAwbrkw` | `READY`, detached `c7fbbbf` prebuilt hotfix |
| 운영 도메인 | `https://jipbab-note-app.vercel.app` | iOS·Android remote WebView도 사용 |
| 운영 Supabase | `JipbabNote`, ref `xqelabiwtjntwrjqcteo` | `ACTIVE_HEALTHY` |
| 운영 recipes | 1,152 legacy rows | 앱 공개 목록은 승인 0개, 명시적 미리보기 8개만 노출 |
| 운영 recipe_sources | 0 rows | 출처 FK 연결 없음 |
| 계획서 기준 공개 가능 recipes | 0 rows | 초보자 검수·출처 ledger·실조리 증거 미충족 |
| 원격 migration history | signed-session prerequisite·hardening은 `20260715101716`까지 별도 적용 | publication·Phase 1·Phase 2와 과거 이력 drift는 미해결 |

현재 production 런타임은 canonical 저장소의 `c7fbbbf`를 깨끗한 detached worktree에서 운영 환경으로 사전 빌드한 제한된 웹 hotfix와 일치한다. 다만 Vercel 프로젝트의 Git 연결은 여전히 오래된 private 저장소 `jipbab-note-app/main`이므로 다음 일반 배포는 Git integration만으로 재현할 수 없고 P0 source mismatch가 남는다.

`20260715101534`, `20260715101553`, `20260715101658`, `20260715101716`의 동기화 prerequisite·signed-session·삭제 cascade·SECURITY DEFINER hardening은 운영 DB에 적용됐다. 반면 과거 로컬 migration drift와 publication·Phase 1·Phase 2 migration은 미해결이다. “이력 없음”과 “스키마 없음”을 동일하게 취급하지 않으며, 전체 live schema 대조 전에는 `supabase db push`를 실행하지 않는다.

## 현재 운영 기준

- 운영 도메인과 모바일 shell URL은 `https://jipbab-note-app.vercel.app`으로 유지한다.
- Supabase 기준 프로젝트는 ref `xqelabiwtjntwrjqcteo` 하나로 고정한다.
- 레시피 수는 UI의 합산 숫자가 아니라 [recipe-inventory.md](./recipe-inventory.md)와 CSV를 기준으로 기록한다.
- `published`, `reviewedForBeginner`, validator pass는 실제 초보자 조리 테스트와 구분한다.
- 검수되지 않은 DB와 live MFDS 데이터는 공개 API·추천·조리 모드에서 계속 차단한다. 자체 작성 fallback은 `검수 중 미리보기`로만 표시하고 조리·장보기 연결을 잠근다.

## 외부 변경 전 필요한 결정

1. Vercel 프로젝트를 public `jipbab-note`에 다시 연결할지, private `jipbab-note-app`을 유지할지 결정한다.
2. public `main`을 현재 release branch로 fast-forward한 뒤 production branch로 쓸지 결정한다.
3. 위 두 작업이 끝날 때까지 GitHub default branch, Vercel production branch, 실제 배포 SHA가 일치한다고 주장하지 않는다.

2026-07-15 웹 hotfix에서는 운영 도메인과 Vercel 프로젝트를 유지한 채 `c7fbbbf` prebuilt 산출물을 배포했다. GitHub default branch 이동과 Vercel Git relink는 수행하지 않았으며 다음 비-hotfix production 배포 전 해결해야 한다.
