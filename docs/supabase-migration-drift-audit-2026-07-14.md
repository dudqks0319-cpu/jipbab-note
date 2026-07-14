# Supabase migration drift 읽기 전용 감사

Updated: 2026-07-14 KST
Project: `JipbabNote` (`xqelabiwtjntwrjqcteo`)
Scope: migration history, PostgreSQL catalog, RLS·Storage policy, function privilege, trigger, backup·branch metadata 확인. 운영 DB 쓰기 없음

## 결론

- local·remote migration history는 `20260508143719`까지 18개가 일치한다.
- 이후 로컬 migration 13개는 remote history에 기록되지 않았다.
- authenticated Supabase read-only catalog 조회로 13개 중 일부가 migration history 없이 수동 또는 부분 적용된 상태임을 확인했다. 가족 RPC·가족 범위 column·Storage bucket/policy는 존재하지만, `recipe_comments`, 계정삭제 trigger, publication column, signed-session 전체 경계, recipe v2 테이블군, rate-limit 테이블은 없다.
- `SECURITY DEFINER` 가족 함수는 `anon` 실행 권한이 남아 있고 `family_group_member_count(uuid)`도 존재한다. 따라서 `20260711113000_harden_security_definer_privileges.sql`은 운영에 적용되지 않았다.
- remote policy 이름과 함수 signature만 같은 항목도 본문·expression이 로컬 최종본과 정확히 같은지는 아직 staging 재현으로 증명되지 않았다. 부분 적용 상태에서 blanket `migration repair`, `db push`, SQL bundle 실행은 금지한다.
- 현재 Supabase branch는 없고, CLI가 반환한 물리 backup 목록은 비어 있으며 PITR도 비활성이다. 복원 가능한 backup 증거 없이 운영 migration을 적용하지 않는다.

## 읽기 전용 확인 명령

```bash
supabase projects list
supabase link --project-ref xqelabiwtjntwrjqcteo --yes
supabase migration list --linked
supabase inspect db table-stats --linked
supabase branches list --project-ref xqelabiwtjntwrjqcteo --output json
supabase backups list --project-ref xqelabiwtjntwrjqcteo --output json
```

추가로 인증된 Supabase read-only 도구에서 `pg_catalog`, `information_schema`, `pg_policies`, function privilege, trigger, Storage bucket metadata만 조회했다. 애플리케이션 사용자 행은 조회하지 않았다. `supabase link`는 이 worktree의 로컬 project ref만 설정했다. migration apply, repair, DDL·DML, 데이터 수정은 하지 않았다.

## Remote history에 없는 로컬 migration

| Version | Migration | 현재 읽기 증거 |
| --- | --- | --- |
| `20260521160347` | `add_family_group_rpc` | 세 RPC signature 존재, history 없음, `anon` 실행 가능 |
| `20260523090000` | `add_recipe_comments` | `public.recipe_comments` 없음 |
| `20260526093000` | `harden_community_image_storage` | 5 MiB public bucket·3개 image MIME·insert/update/delete policy 이름 존재, expression exact diff 필요 |
| `20260527093000` | `add_family_scoped_fridge_shopping` | ingredients·shopping_items `family_group_id`와 관련 policy 이름 존재, expression exact diff 필요 |
| `20260528010000` | `fix_family_member_rls_recursion` | helper 3개와 관련 policy 이름 존재, `anon` 실행 가능, 최종 hardening 미적용 |
| `20260530000000` | `cascade_user_deletion` | `handle_user_deletion()`과 `auth.users.on_auth_user_deleted` trigger 없음 |
| `20260710130000` | `gate_recipe_publication` | `servings_base`, 시간·안전·검수·발행 column 없음. 기존 `recipes_select_public` 이름만 존재 |
| `20260710140000` | `replace_device_guest_auth_with_signed_sessions` | `app.current_device_id()`는 존재하지만 `anon` 실행 가능, `app.is_permanent_user()`·merge RPC 없음. signed-session 전환 불완전 |
| `20260710150000` | `add_recipe_v2_schema_and_versioning` | recipe v2 정규화 테이블군 없음 |
| `20260710151000` | `seed_phase1_ingredient_catalog` | 대상 catalog 테이블 없음 |
| `20260710160000` | `add_distributed_api_rate_limits` | `public.api_rate_limit_buckets` 없음 |
| `20260711113000` | `harden_security_definer_privileges` | 가족 definer의 `anon` 권한과 `family_group_member_count`가 남아 있어 미적용 확정 |
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

## Catalog에서 추가로 확인한 상태

- public table은 13개이며 모든 관찰 대상 public table의 RLS가 활성화돼 있다.
- `ingredients.family_group_id`, `shopping_items.family_group_id`는 존재한다.
- family RPC/helper 6개는 존재하지만 모두 `anon`과 `authenticated`에서 실행 가능하다. 최종 hardening 기대 상태와 다르다.
- Supabase Security Advisor는 WARN 13건을 반환했다. 가족 `SECURITY DEFINER` 6개가 `anon` 실행 가능하다는 경고 6건, 같은 함수의 `authenticated` 실행 경고 6건, leaked password protection 비활성 1건이다. 함수 권한 경고는 [Supabase `anon_security_definer_function_executable` 안내](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)를 따른다.
- `app.current_device_id()`도 `anon`·`authenticated`에서 실행 가능하며 `app.is_permanent_user()`는 없다.
- `community-images` bucket은 public, 5 MiB, PNG/JPEG/WebP 제한이며 객체 insert/update/delete policy 이름 3개가 존재한다.
- `handle_user_deletion()`과 `auth.users.on_auth_user_deleted` trigger는 없다.
- recipe publication column, recipe v2·catalog·rate-limit 테이블은 없다.

## 아직 확인하지 못했거나 실행하지 않은 범위

- 이 머신에는 Docker·`pg_dump`가 없어 container 기반 full schema dump는 생성하지 못했다. Supabase 공식 CLI의 `db dump`는 `pg_dump` container를 사용한다.
- 함수 본문과 policy expression의 local final migration 대비 exact normalized diff는 아직 isolated PostgreSQL에서 재현하지 못했다.
- backup 목록은 비어 있고 PITR은 비활성이다. backup 생성·복원 시험은 실행하지 않았다.
- Supabase staging branch는 없다. branch 생성 비용 조회 결과는 시간당 `$0.01344`이며 사용자 비용 승인 전에는 생성하지 않는다.
- staging apply→검증→rollback→reapply와 API v1 200/429/503는 실행하지 않았다.

## DBA handoff 순서

1. 시간당 `$0.01344` Supabase staging branch 비용을 owner가 승인한 뒤 격리 branch를 생성한다.
2. 운영과 staging의 data 없는 public/storage/auth catalog를 캡처하고 13개 migration을 각각 table·column·function body·trigger·policy·grant 단위로 exact diff한다.
3. remote와 정확히 같은 항목만 history repair 후보로 분류하고, 부분 적용·불일치는 새 forward reconciliation migration으로 처리한다. 이미 배포된 migration 파일은 수정하지 않는다.
4. 복원 가능한 backup 또는 승인된 복원 지점을 만든 뒤 staging에서 forward reconciliation apply→검증→forward rollback→reapply를 실행한다.
5. publication gate, signed-session 경계, family/community isolation, 계정삭제, version capture/restore, rate limit RPC를 실제 PostgreSQL과 API로 검증한다.
6. DBA·보안·제품 owner가 증거를 승인한 뒤에만 Production rollout 순서를 확정한다.

이 절차 전에는 `SUPABASE_MIGRATION_HISTORY_RECONCILED=1` 또는 `SUPABASE_BACKUP_VERIFIED=1`을 설정하지 않는다.
