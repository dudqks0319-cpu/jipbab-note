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
| 원격 migration history | publication `20260710130000`, Phase 1 schema `20260710150000`, Phase 2 rate limit `20260710160000`, signed-session hardening `20260715101716`까지 기록 | 세 migration은 실제 live schema와 일치, 그 이전 로컬 누락 이력과 Phase 1 catalog seed는 별도 정리 필요 |

현재 production 런타임은 canonical 저장소의 `c7fbbbf`를 깨끗한 detached worktree에서 운영 환경으로 사전 빌드한 제한된 웹 hotfix와 일치한다. 다만 Vercel 프로젝트의 Git 연결은 여전히 오래된 private 저장소 `jipbab-note-app/main`이므로 다음 일반 배포는 Git integration만으로 재현할 수 없고 P0 source mismatch가 남는다.

`20260710130000`, `20260710150000`, `20260710160000`은 원격 migration history에 기록돼 있고, 2026-07-15 재감사에서 publication 컬럼 21개, 제약조건 4개, partial index, `recipes`·`recipe_sources` RLS 정책과 Phase 1 `schema_version`을 live schema에서 확인했다. `recipes` 1,152건은 모두 `approved=0`, `published_at=0`, publication evidence-ready 0건이며 공개 API는 빈 승인 목록만 반환한다. `20260715101534`, `20260715101553`, `20260715101658`, `20260715101716`의 동기화 prerequisite·signed-session·삭제 cascade·SECURITY DEFINER hardening도 운영 DB에 적용됐다. 다만 과거 로컬 누락 이력과 `20260710151000` catalog seed는 별도 정리가 필요하므로 전체 `supabase db push`는 계속 금지한다.

운영 백업은 비공개 `ops_backup` schema에 존재한다. Phase 0/1 적용 전 스냅샷은 recipes 1,152건, recipe_sources 0건, 정책 8건, 당시 migration history 19건을 보존하고, signed-session 적용 전 스냅샷은 냉장고 51건, 장보기 18건, 가족 그룹 1건, 가족 구성원 2건, 계정 삭제 요청 21건, 이벤트 18건, 정책 36건, 함수 8건, 당시 migration history 21건을 보존한다. `anon`, `authenticated`, `service_role`, `PUBLIC`의 `ops_backup` table privilege는 0건이다.

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
