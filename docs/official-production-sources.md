# 집밥노트 공식 원본·운영 연결 기준

Audited: 2026-07-15 KST
Status: `canonical Git repository connected; branch and production SHA alignment open`

이 문서는 현재 파일, GitHub, Vercel, Supabase의 실측값을 분리해 기록한다. 외부 설정을 바꾸기 전까지 “권장 공식 원본”과 “현재 실제 운영 연결”은 같은 것으로 표시하지 않는다.

## 현재 확인된 사실

| 표면 | 현재 값 | 판정 |
|---|---|---|
| 권장 canonical GitHub 저장소 | `dudqks0319-cpu/jipbab-note` | 현재 `origin`, 최신 production SHA 보유 |
| GitHub 기본 브랜치 | `main` @ `86e2bc2` | 현재 hotfix branch보다 뒤 |
| production hotfix code | `agent/sync-ux-release`의 `3a8f72f78cde6588be86795d6fd4da4dc9d6308f` | 현재 운영 런타임 기준 코드 |
| Vercel 프로젝트 | `youngbeens-projects/jipbab-note-app` | active production project |
| Vercel Git 연결 | public `dudqks0319-cpu/jipbab-note` | `dpl_GUViZ6f3SEe7zVeWXQnqcyzpc1b5` 빌드 로그의 실제 clone 경로로 확인 |
| 현재 production deployment | `dpl_6vCTkYxfHdyzjByHsqLLK9KGxvNZ` | `READY`, `3a8f72f` 레시피 미리보기 즉시 표시 hotfix |
| 최신 검증 후보 | `agent/sync-ux-release` @ `3560df2c300cfcffd2a0e23fdced07d28e3079ed` | GitHub 원격 HEAD와 로컬 clean HEAD 일치 |
| 동일 SHA Preview | `dpl_6ew7yrR35Y3BeW1Fj8jjWCQLbLxu` | `READY`, `/recipe` HTTP 200, 미리보기 20개, console warning/error 0 |
| 운영 도메인 | `https://jipbab-note-app.vercel.app` | iOS·Android remote WebView도 사용 |
| 운영 Supabase | `JipbabNote`, ref `xqelabiwtjntwrjqcteo` | `ACTIVE_HEALTHY` |
| 운영 recipes | 1,152 legacy rows | 앱 공개 목록은 승인 0개, 명시적 미리보기 20개만 노출 |
| 운영 recipe_sources | 0 rows | 출처 FK 연결 없음 |
| 계획서 기준 공개 가능 recipes | 0 rows | 초보자 검수·출처 ledger·실조리 증거 미충족 |
| 원격 migration history | 로컬·원격 40개 버전 일치, 최신 `20260715135424` | 공식 history repair 완료, `db push --dry-run` 추가 적용 0건 |

현재 production 런타임은 canonical 저장소의 `3a8f72f78cde6588be86795d6fd4da4dc9d6308f` 제한 웹 hotfix와 일치한다. Vercel Git 연결 자체는 public canonical 저장소로 교정된 상태지만, GitHub 기본 브랜치 `main`, 최신 검증 후보 `3560df2`, production 런타임 `3a8f72f`가 서로 다르다. 따라서 P0는 저장소 연결 문제가 아니라 production branch와 승격 SHA를 하나로 정하는 문제로 좁혀진다.

`20260710130000`, `20260710150000`, `20260710160000`은 원격 migration history에 기록돼 있고, 2026-07-15 재감사에서 publication 컬럼 21개, 제약조건 4개, partial index, `recipes`·`recipe_sources` RLS 정책과 Phase 1 `schema_version`을 live schema에서 확인했다. `recipes` 1,152건은 모두 `approved=0`, `published_at=0`, publication evidence-ready 0건이며 공개 API는 빈 승인 목록만 반환한다. `20260715101534`, `20260715101553`, `20260715101658`, `20260715101716`의 동기화 prerequisite·signed-session·삭제 cascade·SECURITY DEFINER hardening도 운영 DB에 적용됐다. `20260715135333` 백업 뒤 `20260715135424` 정정 시드까지 적용해 카탈로그 173개·별칭 258개를 확인했다. 의미상 적용 완료된 로컬 버전 9건은 공식 `supabase migration repair --status applied`로 정렬했고, 로컬·원격 40개 버전이 모두 일치한다. `supabase db push --dry-run --linked`는 추가 적용 대상이 없음을 확인했다.

`20260715120555_fix_app_helper_search_paths_20260715`은 app helper 두 함수의 mutable search path만 고정했다. `current_device_id`는 postgres owner만 실행 가능하고, `is_permanent_user`는 기존대로 authenticated와 postgres만 실행 가능하다. Supabase security advisor의 `function_search_path_mutable` 경고는 2건에서 0건으로 감소했다.

`20260715121727_fix_legacy_ingredient_categories_20260715`과 `20260715121937_enforce_canonical_egg_tofu_categories_20260715`은 정확한 재료명 `계란`·`달걀`·`두부`의 오래된 분류만 교정했다. 변경 전 행은 비공개 `ops_backup`에 20건과 1건으로 나눠 보존했고 앱 역할의 backup table privilege는 0건이다. 최종 운영 행은 계란 12건이 모두 `육류`, 두부 9건이 모두 `통조림/가공식품`이다.

운영 백업은 비공개 `ops_backup` schema에 존재한다. Phase 0/1 적용 전 스냅샷은 recipes 1,152건, recipe_sources 0건, 정책 8건, 당시 migration history 19건을 보존하고, signed-session 적용 전 스냅샷은 냉장고 51건, 장보기 18건, 가족 그룹 1건, 가족 구성원 2건, 계정 삭제 요청 21건, 이벤트 18건, 정책 36건, 함수 8건, 당시 migration history 21건을 보존한다. `anon`, `authenticated`, `service_role`, `PUBLIC`의 `ops_backup` table privilege는 0건이다.

## 현재 운영 기준

- 운영 도메인과 모바일 shell URL은 `https://jipbab-note-app.vercel.app`으로 유지한다.
- Supabase 기준 프로젝트는 ref `xqelabiwtjntwrjqcteo` 하나로 고정한다.
- 레시피 수는 UI의 합산 숫자가 아니라 [recipe-inventory.md](./recipe-inventory.md)와 CSV를 기준으로 기록한다.
- `published`, `reviewedForBeginner`, validator pass는 실제 초보자 조리 테스트와 구분한다.
- 검수되지 않은 DB와 live MFDS 데이터는 공개 API·추천·조리 모드에서 계속 차단한다. 자체 작성 fallback은 `검수 중 미리보기`로만 표시하고 조리·장보기 연결을 잠근다.

## 동일 SHA Preview 증거

- GitHub 원격 `agent/sync-ux-release`: `3560df2c300cfcffd2a0e23fdced07d28e3079ed`
- Vercel Preview: `dpl_6ew7yrR35Y3BeW1Fj8jjWCQLbLxu`, `https://jipbab-note-2pmudzwmm-youngbeens-projects.vercel.app`, `READY`
- 배포 입력: clean worktree의 위 SHA, Vercel metadata에 repository·branch·SHA 명시
- HTTP: `/recipe` 200
- Chrome: 고유 미리보기 링크 20개, 차단 오류 문구 0개, console warning/error 0개
- Preview `/api/v1/recipes?limit=1`: server dependency 환경이 없는 Preview에서는 redacted 503과 `Cache-Control: no-store`, `Retry-After`, `X-Request-Id`를 반환한다. UI는 승인 데이터를 꾸며내지 않고 자체 작성 미리보기 20개만 계속 표시한다.
- 화면 증거: `/tmp/jipbab-exact-sha-preview-recipes.png`

## 외부 변경 전 필요한 결정

1. `main`을 검증 후보로 fast-forward 또는 PR merge한 뒤 production branch로 유지할지 결정한다.
2. `3560df2` 이후 문서-only 후속 커밋까지 포함한 최종 승격 SHA를 고정한다.
3. 위 작업이 끝날 때까지 GitHub default branch, Vercel production branch, 실제 production SHA가 일치한다고 주장하지 않는다.

2026-07-15 웹 hotfix에서는 운영 도메인과 Vercel 프로젝트를 유지한 채 `3a8f72f78cde6588be86795d6fd4da4dc9d6308f` 산출물을 배포했다. 이후 Vercel이 public canonical 저장소를 clone하는 것은 확인했지만 GitHub default branch 이동과 production SHA 승격은 수행하지 않았으며 다음 비-hotfix production 배포 전 해결해야 한다.
