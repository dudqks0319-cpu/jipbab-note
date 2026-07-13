# Phase 6 비파괴 롤백 연습

Updated: 2026-07-13 KST

## 목적

계획서 Phase 6 완료 기준의 `롤백 연습 완료`를 한 번에 과장하지 않고 다음 세 경계로 나눠 검증한다.

1. 코드: 직전 정상 commit을 clean archive로 재현해 필수 검사, production build, 로컬 HTTP smoke를 실행한다.
2. Vercel: 알려진 정상 deployment와 GitHub SHA를 기록하지만 운영 Vercel alias를 변경하지 않는다.
3. 데이터베이스: critical migration과 fail-closed rollback pair를 정적으로 검사하되 실제 staging PostgreSQL 실행 전에는 `blocked_external`로 유지한다.

## 실행 명령

```bash
pnpm check:phase6-rollback
pnpm capture:phase6-rollback \
  --target-ref <known-good-commit> \
  --target-url <known-good-preview-url>
```

`--target-ref`는 현재 commit과 다른 ancestor commit이어야 하고 `--target-url`은 해당 commit으로 만든 query 없는 `jipbab-note-*.vercel.app` HTTPS 앱 root여야 한다. 실행기는 `git archive`로 임시 디렉터리를 만들고 `pnpm install --offline --frozen-lockfile`을 사용한다. native sync는 이 URL이 실제 집밥노트인지 read-only로 확인한다. 현재 branch, index, working tree, Vercel deployment와 Supabase에는 쓰지 않는다.

## 코드 롤백 판정

다음이 모두 통과해야 `passed_local_code_rehearsal`이다.

- `pnpm install --offline --frozen-lockfile`
- `pnpm mobile:sync:ios`로 Git에서 제외된 Capacitor native config 재생성
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm validate:recipes`
- `pnpm test:content`
- `pnpm build`
- 임시 production server의 `/`와 `/recipe` HTTP 200
- server secret이 없는 `/api/v1/recipes?limit=1`의 redacted 503, `DEPENDENCY_NOT_READY`, `no-store`, retry와 request ID header

실행 결과는 `output/rollback-evidence/<timestamp>/rollback-rehearsal.{json,md}`에 저장하며 `output/`은 Git에서 제외한다. build/server 로그는 마지막 80줄만 저장하고 key, JWT, 이메일과 임시 경로를 redaction한다.

## DB 롤백 판정

다음 migration은 동일 이름 rollback 파일이 있어야 한다.

- `20260710130000_gate_recipe_publication.sql`
- `20260710140000_replace_device_guest_auth_with_signed_sessions.sql`
- `20260710150000_add_recipe_v2_schema_and_versioning.sql`
- `20260710151000_seed_phase1_ingredient_catalog.sql`
- `20260710160000_add_distributed_api_rate_limits.sql`
- `20260711113000_harden_security_definer_privileges.sql`

자동 검사는 rollback에서 `drop table`, `drop column`, `truncate`를 거부한다. 이 통과는 PostgreSQL 실행 증거가 아니다. 다음 조건이 준비된 뒤 실제 staging PostgreSQL에서 forward migration, 음성 권한 검사, rollback, 데이터 보존, 재적용을 수행해야 한다.

- remote migration history reconciliation
- restorable backup과 복원 확인
- production과 같은 schema의 isolated staging
- 검수된 recipe v2 fixture
- server-only rate-limit secret

## Vercel 판정

이 실행기는 `vercel rollback`, alias 변경 또는 production promotion을 호출하지 않는다. 코드 롤백 후보가 local production build와 smoke를 통과해도 실제 Vercel rollback은 장애 시 운영자 승인, 직전 정상 deployment ID 확인, rollback 후 HTTP·로그 재검증이 필요하다.

## 현재 증거와 남은 위험

- 로컬 실행 결과: runtime capture의 `result`와 commit SHA를 기준으로 판단한다.
- Vercel actual rollback: `not_executed`.
- DB actual rollback: `blocked_external`.
- Owner `FullStackDev+DBA`, due `before_any_supabase_db_push`: migration history, backup, 실제 staging PostgreSQL rollback·restore drill.
- Owner `FullStackDev+SRE`, due `before_phase6_completion`: 승인된 Vercel Preview rollback rehearsal와 post-rollback HTTP/log evidence.

코드 연습만으로 Phase 6 전체 또는 production rollback을 완료로 표시하지 않는다.
