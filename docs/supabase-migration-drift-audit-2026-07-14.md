# Supabase migration drift 읽기 전용 감사

Updated: 2026-07-14 KST
Project: `JipbabNote` (`xqelabiwtjntwrjqcteo`)
Scope: migration history와 public table 존재 여부만 확인, 운영 DB 쓰기 없음

## 결론

- local·remote migration history는 `20260508143719`까지 18개가 일치한다.
- 이후 로컬 migration 13개는 remote history에 기록되지 않았다.
- remote public table 통계에는 `recipe_comments`, recipe v2 정규화 테이블군, `api_rate_limit_buckets`가 없다. 따라서 최소한 해당 DDL은 현재 운영 스키마에 완전히 적용된 상태가 아니다.
- 함수, RLS policy, Storage policy, trigger, column 단위 변경은 table 통계만으로 동일성을 증명할 수 없다. 일부가 수동 적용됐을 가능성을 배제할 수 없으므로 blanket `migration repair`, `db push`, SQL bundle 실행은 금지한다.

## 읽기 전용 확인 명령

```bash
supabase projects list
supabase link --project-ref xqelabiwtjntwrjqcteo --yes
supabase migration list --linked
supabase inspect db table-stats --linked
```

`supabase link`는 이 worktree의 로컬 project ref만 설정했다. migration apply, repair, SQL 실행, 데이터 조회·수정은 하지 않았다.

## Remote history에 없는 로컬 migration

| Version | Migration | 현재 읽기 증거 |
| --- | --- | --- |
| `20260521160347` | `add_family_group_rpc` | 함수 동일성 미검증 |
| `20260523090000` | `add_recipe_comments` | `public.recipe_comments` 없음 |
| `20260526093000` | `harden_community_image_storage` | Storage policy 동일성 미검증 |
| `20260527093000` | `add_family_scoped_fridge_shopping` | 기존 테이블 column·policy 동일성 미검증 |
| `20260528010000` | `fix_family_member_rls_recursion` | 함수·policy 동일성 미검증 |
| `20260530000000` | `cascade_user_deletion` | trigger 함수 동일성 미검증 |
| `20260710130000` | `gate_recipe_publication` | recipes publication column·policy 동일성 미검증 |
| `20260710140000` | `replace_device_guest_auth_with_signed_sessions` | 함수·policy 동일성 미검증 |
| `20260710150000` | `add_recipe_v2_schema_and_versioning` | recipe v2 정규화 테이블군 없음 |
| `20260710151000` | `seed_phase1_ingredient_catalog` | 대상 catalog 테이블 없음 |
| `20260710160000` | `add_distributed_api_rate_limits` | `public.api_rate_limit_buckets` 없음 |
| `20260711113000` | `harden_security_definer_privileges` | 함수 권한 동일성 미검증 |
| `20260711170000` | `reclassify_egg_tofu_catalog` | 대상 catalog 테이블 없음, partner seed 동일성 미검증 |

## Remote public table 관찰

`supabase inspect db table-stats --linked`에서 다음 13개 public table만 관찰됐다.

- `recipes`
- `shopping_items`
- `family_members`
- `ingredients`
- `family_groups`
- `account_deletion_requests`
- `partner_links`
- `community_likes`
- `favorites`
- `account_deletion_request_events`
- `community_comments`
- `community_posts`
- `recipe_sources`

빈 테이블도 통계에 표시되므로, 아래 migration 대상 테이블이 목록에 없다는 사실은 단순 row count 0과 구분된다.

- `recipe_comments`
- `recipe_categories`
- `ingredients_catalog`
- `ingredient_aliases`
- `recipe_ingredients`
- `recipe_ingredient_substitutions`
- `recipe_steps`
- `recipe_step_ingredients`
- `recipe_reviews`
- `recipe_versions`
- `api_rate_limit_buckets`

## 확인하지 못한 범위

- Supabase MCP는 별도 access token이 없어 unauthorized였다.
- `supabase db dump --linked --schema public`은 Docker daemon이 꺼져 있어 실행되지 않았고 schema dump 파일은 생성되지 않았다.
- 따라서 함수 본문, trigger, RLS·Storage policy, grants, recipes/ingredients/shopping_items column은 아직 authoritative diff가 없다.
- backup 생성·복원, staging apply→rollback→reapply, API v1 200/429/503는 실행하지 않았다.

## DBA handoff 순서

1. Docker/`pg_dump` 또는 승인된 Supabase MCP로 data 없는 remote public/storage/auth 관련 schema를 캡처한다.
2. 13개 migration 각각에 대해 table·column·function body·trigger·policy·grant를 exact diff로 분리한다.
3. remote와 정확히 같은 migration만 history repair 후보로 분류하고, 부분 적용·불일치는 새 forward reconciliation migration으로 처리한다.
4. 복원 가능한 backup을 만들고 별도 staging에서 apply→검증→rollback→reapply를 실행한다.
5. publication gate, signed-session 경계, family/community isolation, version capture/restore, rate limit RPC를 실제 PostgreSQL과 API로 검증한다.
6. DBA·보안·제품 owner가 증거를 승인한 뒤에만 Production rollout 순서를 확정한다.

이 절차 전에는 `SUPABASE_MIGRATION_HISTORY_RECONCILED=1` 또는 `SUPABASE_BACKUP_VERIFIED=1`을 설정하지 않는다.
