# Phase 0 기준선 보고서

Date: 2026-07-10 KST
Head: `efd86133c12bb509bb8eedbd033bfed98d24b250`
Branch: `ux/home-today-action-v2`

## 결과

Phase 0 감사와 인벤토리 추출은 완료했다. 공식 원본 정합성, 레시피 공개 상태, 게스트 권한에는 production 차단급 문제가 남아 있어 다음 배포는 P0 수정과 외부 원본 결정을 통과해야 한다.

## 공식 원본

- canonical 후보: public `dudqks0319-cpu/jipbab-note`
- GitHub default `main`: current release branch보다 33 commits 뒤
- Vercel Git link: stale private `dudqks0319-cpu/jipbab-note-app/main`
- active production deployment: `dpl_GEJgsnCvRuofgWg82z74Wdw2UR9K`, SHA `efd8613`, `READY`
- production domain: `https://jipbab-note-app.vercel.app`
- Supabase: `JipbabNote`, `xqelabiwtjntwrjqcteo`, `ACTIVE_HEALTHY`
- remote migration history: `20260508143719`까지만 기록; 이후 로컬 6개와 `20260710130000` 미기록

상세 기준은 [official-production-sources.md](./official-production-sources.md)에 기록했다.

## 레시피 데이터

| 항목 | 현재값 |
|---|---:|
| 운영 `public.recipes` | 1,152 |
| 운영 `recipe_sources` | 0 |
| `reviewed_for_beginner = true` | 0 |
| 난이도·조리시간·인분 누락 | 1,146 |
| 재료 3개 미만 | 4 |
| 단계 3개 미만 | 1 |
| 로컬 runtime catalog | 186 |
| 계획서 기준 공개 가능 | 0 |

생성 산출물:

- [recipe-inventory.csv](./recipe-inventory.csv)
- [recipe-inventory.md](./recipe-inventory.md)
- [recipe-source-ledger.csv](./recipe-source-ledger.csv)

## 공개 경로 P0

- DB RLS는 `recipes` 모든 행을 anon에게 허용한다.
- `/api/recipes`는 검수 상태 필터 없이 DB를 우선 반환한다.
- DB가 비면 live MFDS 원본을 사용자 요청 경로에서 직접 반환한다.
- client fallback은 상태가 없는 10개 legacy와 `published` 100개를 노출 후보로 취급한다.
- 실제 조리 테스트 증거는 데이터 모델에 기록돼 있지 않다.

따라서 현재 “validator pass”나 route `200`은 출시 기준을 증명하지 않는다.

### 2026-07-10 로컬 차단 구현

- `20260710130000_gate_recipe_publication.sql`에 스키마 v2 필드, 검수·실조리·식품안전·이미지 권리·출처·발행 증거와 fail-closed RLS를 추가했다.
- anon 직접 REST도 재료 계량, 도구, 단계 설명, 불 세기, 시간, 완료 신호가 완전한 행만 읽을 수 있다.
- 공개 `/api/recipes`에서 live MFDS 호출을 삭제했다. MFDS는 seed/import 스크립트에서만 사용한다.
- API 응답, IndexedDB 레시피 캐시, 로컬 큐레이션, App Store 데모, 즐겨찾기, 홈·가족 추천과 직접 상세 URL에 같은 공개 증거 게이트를 적용했다.
- 미검수 상세에는 임의 분량·조리시간·공통 조리 단계 대신 `이 레시피는 현재 검수 중이에요.` 상태만 표시한다.
- fail-closed 롤백은 `supabase/rollbacks/20260710130000_gate_recipe_publication.sql`이다. 롤백 중에도 anon 공개는 0건으로 유지하며 데이터 컬럼은 삭제하지 않는다.

이 구현은 아직 운영 Supabase에 적용하거나 Vercel Production에 배포하지 않았다. 현재 운영 노출 상태는 위 기준선과 동일하며, DB 백업·운영 원본 정렬·게스트 인증 P0가 해결되기 전에는 적용하지 않는다.

또한 remote migration history가 local과 어긋나므로 `supabase db push`는 현재 금지한다. 먼저 live schema와 각 누락 migration의 실제 수동 적용 상태를 비교하고 이력을 안전하게 복구해야 한다.

## 보안 기준선

### P0: guest device ID bearer authorization — local fix verified, production not applied

기준선 당시에는 공개 응답이나 브라우저 저장소에서 얻은 `device_id`를 `x-device-id`로 재사용하면 RLS guest identity로 동작할 수 있었다. 로컬 구현은 공유 Supabase 클라이언트의 헤더 주입을 제거하고, 개인 원격 동기화의 소유권을 검증된 `auth.uid()`로만 제한한다. 가족 공유·커뮤니티·댓글·커뮤니티 이미지는 일반 계정만 허용하며 invalid bearer는 guest로 강등하지 않는다.

`20260710140000_replace_device_guest_auth_with_signed_sessions.sql`은 기존 header/device 정책과 anon RPC 권한을 교체하고, `app.current_device_id()`를 항상 null로 만든다. 로그인 전 원격 null-user 행은 공격자가 주장할 수 있는 device ID로 재귀속하지 않고 접근 불가 상태로 둔다. 익명 Supabase 사용자에서 기존 일반 계정으로 옮길 때는 두 access token을 서버에서 검증한 뒤 service-role 전용 트랜잭션 RPC만 실행한다. 자세한 계약과 롤아웃 순서는 `docs/guest-session-security.md`에 있다.

운영 Supabase와 Vercel에는 아직 적용하지 않았다. 따라서 운영 위험은 migration history 정합화, 백업, staging negative test, 앱/DB 동시 rollout 전까지 열린 상태다.

Owner: FullStackDev + Security
Due: before next production deployment

### 남은 보안 위험

- 운영 DB의 기존 `SECURITY DEFINER` 함수와 device-header 정책은 새 migration 적용 전까지 열려 있음
- process-local rate limit과 전달 IP 신뢰
- 로컬 secret 파일 권한은 `0600`으로 보정했으며 git에는 추적되지 않는다.
- public display name을 email local part에서 파생
- production dependency low advisory 1건

## fresh verification

- `pnpm validate:recipes`: pass, 176 candidates
- `pnpm exec tsc --noEmit --pretty false`: pass
- `pnpm lint`: pass with 2 warnings
- `pnpm test:unit`: pass, 288 tests
- `pnpm check:curated-beginner-guidance`: pass, 186 recipes
- `pnpm check:beginner-mobile-evidence`: pass, 12 checks
- initial `pnpm release:ci-static-check`: 8 pass, 2 fail
  - environment-only: npm audit DNS failure in the first sandbox run
  - repository failure: store API runbook had stale build `2026060803`
- final `pnpm release:ci-static-check`: pass, 10/10 after networked audit and build-number repair
- `pnpm check:store-console-confirmation -- --platform=appstore`: pass for build `2026062602`, `VALID`, internal TestFlight group present
- `pnpm test:integration`: pass, 실제 로컬 Next.js에서 공개 API 0건과 직접 상세 차단 확인
- `pnpm test`: pass, 297 tests
- `pnpm check:supabase-release`: pass, 108 checks
- `pnpm build`: pass, 35 routes generated
- Browser QA: 360/390/430 가로 넘침 0, 390 목록 카드 0, 직접 상세 차단, console error 0
- UI evidence: `output/ui-evidence/2026-07-10-publication-empty-home-{360-viewport,390,430}.png`, `2026-07-10-publication-empty-list-390.png`, `2026-07-10-publication-blocked-detail-390.png`

실제 production, browser, mobile, DB write, App Store, Play Console 상태는 각각 별도 gate다. 이 보고서는 그 표면들을 한 개의 pass로 합치지 않는다.

## post-implementation review

| 검토 축 | 판정 | 근거 |
|---|---|---|
| 현재 목표 적합성 | local slice pass / 전체 goal partial | 공개 차단은 구현됐지만 Phase 0 운영 원본·백업과 이후 Phase는 미완료 |
| 실행 QA | pass | 실제 Next.js API, 360/390/430 브라우저, 직접 상세 URL 확인 |
| 코드 품질 | pass | public MFDS dead path 삭제, demo·favorite 우회 차단, 회귀 테스트 추가 |
| 보안 | local fix pass / production release fail | signed UID·permanent-user 경계와 negative tests는 통과했지만 운영 migration은 미적용 |
| 운영 문맥 | release fail | GitHub/Vercel 원본 불일치와 Supabase migration history drift가 남음 |

따라서 “local publication gate verified”만 통과로 기록한다. Phase 0 전체 완료, 운영 적용, 출시 준비 완료로 표시하지 않는다.

운영 백업은 아직 생성하지 않았다. Supabase CLI `db dump --dry-run`은 공유 로그에 임시 연결 자격증명을 출력하므로 이 경로를 재사용하지 않는다. 이후 자격증명을 출력하지 않는 읽기 전용 연결로 CLI 로그인 역할을 다시 초기화했으며, 실제 백업은 출력 격리가 된 보안 터미널에서 수행해야 한다.

## 다음 순서

1. GitHub/Vercel canonical 원본 결정 후 외부 정합화
2. local/remote migration history와 live schema 드리프트 정리
3. 운영 DB 복원 가능한 백업 확인
4. staging에서 signed-session migration과 두 사용자·무서명 negative test
5. 운영 백업 후 publication·signed-session migration과 앱을 함께 적용
6. 실제 조리·검수된 핵심 레시피만 단계적으로 발행
