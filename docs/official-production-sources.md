# 집밥노트 공식 원본·운영 연결 기준

Audited: 2026-07-10 KST
Status: `P0 mismatch open`

이 문서는 현재 파일, GitHub, Vercel, Supabase의 실측값을 분리해 기록한다. 외부 설정을 바꾸기 전까지 “권장 공식 원본”과 “현재 실제 운영 연결”은 같은 것으로 표시하지 않는다.

## 현재 확인된 사실

| 표면 | 현재 값 | 판정 |
|---|---|---|
| 권장 canonical GitHub 저장소 | `dudqks0319-cpu/jipbab-note` | 현재 `origin`, 최신 production SHA 보유 |
| GitHub 기본 브랜치 | `main` @ `86e2bc2` | 현재 release branch보다 33 commits 뒤 |
| 현재 release branch | `ux/home-today-action-v2` @ `efd8613` | `origin`과 동기화 |
| Vercel 프로젝트 | `youngbeens-projects/jipbab-note-app` | active production project |
| Vercel Git 연결 | private `dudqks0319-cpu/jipbab-note-app`, branch `main` | canonical 후보와 불일치 |
| 현재 production deployment | `dpl_GEJgsnCvRuofgWg82z74Wdw2UR9K` | `READY`, SHA `efd8613` |
| 운영 도메인 | `https://jipbab-note-app.vercel.app` | iOS·Android remote WebView도 사용 |
| 운영 Supabase | `JipbabNote`, ref `xqelabiwtjntwrjqcteo` | `ACTIVE_HEALTHY` |
| 운영 recipes | 1,152 rows | 현재 RLS로 anon 노출 |
| 운영 recipe_sources | 0 rows | 출처 FK 연결 없음 |
| 계획서 기준 공개 가능 recipes | 0 rows | 초보자 검수·출처 ledger·실조리 증거 미충족 |
| 원격 migration history | `20260508143719`까지 | 이후 로컬 6개와 신규 publication migration 미기록 |

현재 production 배포 메타데이터는 `ux/home-today-action-v2`와 `efd8613`을 가리키지만 Vercel 프로젝트의 Git 연결은 오래된 private 저장소 `jipbab-note-app/main`이다. 따라서 현재 배포는 Git integration을 신뢰해 재현할 수 없고, 로컬 CLI 배포에 의존한다.

`supabase migration list --linked` 결과 원격 이력에는 `20260521160347`부터 `20260530000000`까지 6개 로컬 마이그레이션과 `20260710130000`이 없다. 일부 SQL은 과거 운영에 수동 적용됐다는 별도 증거가 있어 “이력 없음”과 “스키마 없음”을 동일하게 취급하지 않는다. migration history와 실제 live schema를 먼저 대조하기 전에는 `supabase db push`를 실행하지 않는다.

## 현재 운영 기준

- 운영 도메인과 모바일 shell URL은 `https://jipbab-note-app.vercel.app`으로 유지한다.
- Supabase 기준 프로젝트는 ref `xqelabiwtjntwrjqcteo` 하나로 고정한다.
- 레시피 수는 UI의 합산 숫자가 아니라 [recipe-inventory.md](./recipe-inventory.md)와 CSV를 기준으로 기록한다.
- `published`, `reviewedForBeginner`, validator pass는 실제 초보자 조리 테스트와 구분한다.
- 검수되지 않은 DB, live MFDS, 로컬 fallback 데이터는 다음 production 배포 전 공개 차단해야 한다.

## 외부 변경 전 필요한 결정

1. Vercel 프로젝트를 public `jipbab-note`에 다시 연결할지, private `jipbab-note-app`을 유지할지 결정한다.
2. public `main`을 현재 release branch로 fast-forward한 뒤 production branch로 쓸지 결정한다.
3. 위 두 작업이 끝날 때까지 GitHub default branch, Vercel production branch, 실제 배포 SHA가 일치한다고 주장하지 않는다.

이번 Phase 0에서는 GitHub branch 이동, Vercel relink, domain 변경, Supabase 쓰기를 수행하지 않았다.
