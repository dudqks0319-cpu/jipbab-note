# 집밥노트 공식 원본·운영 연결 기준

Audited: 2026-07-16 KST
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
| 최신 검증 코드 후보 | `agent/sync-ux-release` @ `01e9895a20ae0dc1243a19f776753289ee05dce2` | 홈 레시피 즉시 노출·동기화 단일 실행 포함, exact Git Preview 검증 완료 |
| 재감사 시작 시 후보 브랜치 원격 HEAD | `edf651f5b52b79e84797b72981bde45d45acf8a1` | 위 코드 후보 이후 출시 문서만 갱신한 2026-07-16 기준점 |
| 동일 SHA Preview | `dpl_2bw49EivkL5wJSEWo8TkqT7zGRLg` | `READY`, 레시피 2개 즉시 노출, loading/skeleton 0, console warning/error 0 |
| 운영 도메인 | `https://jipbab-note-app.vercel.app` | iOS·Android remote WebView도 사용 |
| 운영 Supabase | `JipbabNote`, ref `xqelabiwtjntwrjqcteo` | `ACTIVE_HEALTHY` |
| 운영 recipes | 1,152 legacy rows | 앱 공개 목록은 승인 0개, 명시적 미리보기 20개만 노출 |
| 운영 recipe_sources | 0 rows | 출처 FK 연결 없음 |
| 계획서 기준 공개 가능 recipes | 0 rows | 초보자 검수·출처 ledger·실조리 증거 미충족 |
| 원격 migration history | 로컬·원격 40개 버전 일치, 최신 `20260715135424` | 공식 history repair 완료, `db push --dry-run` 추가 적용 0건 |

현재 production 런타임은 canonical 저장소의 `3a8f72f78cde6588be86795d6fd4da4dc9d6308f` 제한 웹 hotfix와 일치한다. Vercel Git 연결 자체는 public canonical 저장소로 교정된 상태지만, 보호된 GitHub 기본 브랜치 `main`(`86e2bc2`), 최신 검증 코드 후보 `01e9895`, production 런타임 `3a8f72f`가 서로 다르다. 재감사 시작 시 `agent/sync-ux-release`를 `main`으로 보내는 열린 PR도 없었다. 따라서 P0는 저장소 연결 문제가 아니라 검증 후보를 보호 브랜치에 통합하고 production 승격 SHA를 하나로 정하는 문제로 좁혀진다.

`20260710130000`, `20260710150000`, `20260710160000`은 원격 migration history에 기록돼 있고, 2026-07-15 재감사에서 publication 컬럼 21개, 제약조건 4개, partial index, `recipes`·`recipe_sources` RLS 정책과 Phase 1 `schema_version`을 live schema에서 확인했다. `recipes` 1,152건은 모두 `approved=0`, `published_at=0`, publication evidence-ready 0건이며 공개 API는 빈 승인 목록만 반환한다. `20260715101534`, `20260715101553`, `20260715101658`, `20260715101716`의 동기화 prerequisite·signed-session·삭제 cascade·SECURITY DEFINER hardening도 운영 DB에 적용됐다. `20260715135333` 백업 뒤 `20260715135424` 정정 시드까지 적용해 카탈로그 173개·별칭 258개를 확인했다. 의미상 적용 완료된 로컬 버전 9건은 공식 `supabase migration repair --status applied`로 정렬했고, 로컬·원격 40개 버전이 모두 일치한다. `supabase db push --dry-run --linked`는 추가 적용 대상이 없음을 확인했다.

`20260715120555_fix_app_helper_search_paths_20260715`은 app helper 두 함수의 mutable search path만 고정했다. `current_device_id`는 postgres owner만 실행 가능하고, `is_permanent_user`는 기존대로 authenticated와 postgres만 실행 가능하다. Supabase security advisor의 `function_search_path_mutable` 경고는 2건에서 0건으로 감소했다.

`20260715121727_fix_legacy_ingredient_categories_20260715`과 `20260715121937_enforce_canonical_egg_tofu_categories_20260715`은 정확한 재료명 `계란`·`달걀`·`두부`의 오래된 분류만 교정했다. 변경 전 행은 비공개 `ops_backup`에 20건과 1건으로 나눠 보존했고 앱 역할의 backup table privilege는 0건이다. 최종 운영 행은 계란 12건이 모두 `육류`, 두부 9건이 모두 `통조림/가공식품`이다.

운영 백업은 비공개 `ops_backup` schema에 존재한다. 2026-07-16 `supabase inspect db table-stats --linked`로 백업 테이블을 다시 읽기 전용 확인했다. Phase 0/1 적용 전 스냅샷은 recipes 1,152건, recipe_sources 0건, 정책 8건, 당시 migration history 19건을 보존하고, signed-session 적용 전 스냅샷은 냉장고 51건, 장보기 18건, 가족 그룹 1건, 가족 구성원 2건, 계정 삭제 요청 21건, 이벤트 18건, 정책 36건, 함수 8건, 당시 migration history 21건을 보존한다. 재료 분류 수정 전 백업 20건과 1건도 유지된다. `anon`, `authenticated`, `service_role`, `PUBLIC`의 `ops_backup` table privilege는 0건이다.

## 현재 운영 기준

- 운영 도메인과 모바일 shell URL은 `https://jipbab-note-app.vercel.app`으로 유지한다.
- Supabase 기준 프로젝트는 ref `xqelabiwtjntwrjqcteo` 하나로 고정한다.
- 레시피 수는 UI의 합산 숫자가 아니라 [recipe-inventory.md](./recipe-inventory.md)와 CSV를 기준으로 기록한다.
- `published`, `reviewedForBeginner`, validator pass는 실제 초보자 조리 테스트와 구분한다.
- 검수되지 않은 DB와 live MFDS 데이터는 공개 API·추천·조리 모드에서 계속 차단한다. 자체 작성 fallback은 `검수 중 미리보기`로만 표시하고 조리·장보기 연결을 잠근다.

## 최신 코드 후보와 동일한 Preview 증거

- GitHub 코드 후보: `agent/sync-ux-release`의 `01e9895a20ae0dc1243a19f776753289ee05dce2`
- 재감사 시작 시 GitHub 원격 브랜치 HEAD: `edf651f5b52b79e84797b72981bde45d45acf8a1`이며 `01e9895` 이후 문서-only 커밋만 포함한다. 이 값은 감사 기준점이지 이후 문서 커밋을 포함한 영구 HEAD 주장이 아니다.
- Vercel Preview: `dpl_2bw49EivkL5wJSEWo8TkqT7zGRLg`, `https://jipbab-note-26cc8f9eq-youngbeens-projects.vercel.app`, `READY`
- 배포 입력: canonical 저장소, `agent/sync-ux-release`, 코드 후보 `01e9895`를 Vercel Git integration이 clone했다.
- Chrome: 첫 완료 렌더와 재로딩에서 레시피 카드 2개가 냉장고보다 먼저 보이고, `불러오는 중`·추천 skeleton·동기화 지연 배너·console warning/error는 모두 0건이다.
- 계란·두부 저장 직후 순두부계란탕·달걀죽 카드가 유지되고 새로고침 뒤 재료와 완료 상태가 복원된다.
- `/recipe`는 자체 작성 미리보기 20개를 표시하되, 검수 전 조리·장보기 실행은 잠근다.

## 외부 변경 전 필요한 결정

1. 보호된 `main`에 `agent/sync-ux-release`를 통합할 PR을 만들고 required checks와 사람 리뷰를 통과시킨다. 직접 fast-forward하거나 Draft PR #4의 오래된 base에 섞지 않는다.
2. PR merge SHA를 최종 production 승격 후보로 고정하고 `01e9895`의 exact Preview 증거가 merge 결과에서도 유지되는지 재검증한다.
3. Draft PR #4는 `ux/home-today-action-v2` 기반이고 Toddler Meals CI가 실패 중이므로 현재 출시 후보와 분리한다.
4. 위 작업이 끝날 때까지 GitHub default branch, Vercel production branch, 실제 production SHA가 일치한다고 주장하지 않는다.

2026-07-15 웹 hotfix에서는 운영 도메인과 Vercel 프로젝트를 유지한 채 `3a8f72f78cde6588be86795d6fd4da4dc9d6308f` 산출물을 배포했다. 2026-07-16 재확인에서도 운영 별칭은 같은 `READY` deployment를 가리킨다. Vercel이 public canonical 저장소를 clone하는 것은 확인했지만 GitHub default branch 통합과 production SHA 승격은 수행하지 않았으며 다음 비-hotfix production 배포 전 해결해야 한다.
