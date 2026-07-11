# Phase 1 recipe data contract

Date: 2026-07-10
Status: local design and migration work only; no production database change

## Audited baseline

- `public.recipes` stores recipe ingredients and steps as JSONB. The publication migration adds the reviewed/source/time/safety fields and blocks every row that lacks complete evidence.
- `public.recipe_sources` exists, but the live inventory has 0 source rows for 1,152 live recipes.
- The app-owned ingredient catalog contains 173 stable IDs and 84 explicit aliases. It is code data, not yet a relational Supabase catalog.
- UI recipe categories mix product filters, dish types, and cuisines. They cannot be copied into one database enum without losing meaning.
- There are no normalized recipe ingredient, substitution, step, step-ingredient, review, or version tables.
- There is no executable previous-version restore path and no dry-run report for converting legacy JSONB rows.

## Phase 1 decisions

1. The migration is additive. Legacy JSONB columns remain the rollback source and are not deleted.
2. `recipes.schema_version` remains `1` until one recipe has complete normalized child rows and passes validation. Creating tables never upgrades a recipe automatically.
3. Canonical category IDs are stable English keys. Product quick filters and cuisine labels stay separate from the dish category.
4. Only deterministic legacy category values are mapped automatically. Combined labels such as `국&찌개` and broad labels such as `한식` remain unresolved for editor review.
5. Ingredient canonical names and aliases are seeded only from the existing app-owned catalog. Alias matching is normalized equality, never substring ownership; `파` must not match `양파`.
6. Recipe versions contain a complete recipe snapshot, including normalized children. Capture and restore functions are service-role only, use a fixed `search_path`, and never publish a recipe as a side effect.
7. Review rows are internal evidence. They do not replace the existing publication gate until a later validated migration explicitly reconciles them.
8. The migration-history drift and restorable backup remain hard rollout blockers. These files must be validated in staging before production.

The beginner editorial and actual-cooking evidence threshold is defined in `docs/beginner-recipe-review-rubric.md`.

## Canonical dish categories

| ID | Display label |
|---|---|
| `rice` | 밥·한 그릇 |
| `soup` | 국 |
| `stew` | 찌개·전골 |
| `side` | 반찬 |
| `egg` | 달걀 |
| `tofu` | 두부 |
| `meat` | 고기 |
| `seafood` | 해산물 |
| `noodle` | 면 |
| `snack` | 분식 |
| `western` | 양식 |
| `chinese` | 중식 |
| `japanese` | 일식 |
| `dessert` | 간식·디저트 |
| `other` | 기타 |

## Local completion evidence

The Phase 1 gate must prove all of the following before this document can be marked complete:

- schema and rollback contracts include every normalized table;
- category mapping reports ambiguous values instead of guessing;
- all 173 catalog items and their explicit aliases produce deterministic seed data;
- the migration report separates ready, blocked, and unresolved recipes;
- version capture and restore contracts are service-role only;
- publication policies remain fail closed;
- unit, content, Supabase contract, integration, and build gates pass.

## Runtime database boundary

The current machine has no local PostgreSQL server or Docker runtime, so the new SQL has not been executed against an isolated database in this checkpoint. Static schema, privilege, snapshot, optimistic-version, and non-destructive rollback contracts are covered locally, but capture/restore execution must pass in staging after migration-history reconciliation and a restorable backup. Production is not an acceptable SQL parser or test target.

## Debugging and security audit

Three failure hypotheses were exercised:

1. One normalized alias could silently own two ingredients. The generator initially exposed the existing `불고기용 소고기` collision, the generic-beef alias was removed, and the regenerated catalog now passes with 258 globally unique aliases; `파` and `양파` resolve to different IDs.
2. The migration classifier could guess a dish type from combined labels. The live dry run kept all 105 `국&찌개` rows unresolved and produced 0 automatic v2 candidates.
3. Re-running generators could duplicate or drift the canonical schema. A generate-and-sync rerun produced the same schema SHA-256 and exactly one Phase 1 marker block.

The Phase 1 security gate keeps normalized tables private from anon/authenticated roles, exposes only active category labels, restricts snapshot capture/restore to service role, validates same-recipe step links with composite foreign keys, and uses optimistic version checks. No dependency was added, generated evidence contains no credential-shaped values, and the release security audit remains clean. The unexecuted staging SQL and production migration-history drift remain owned, dated blockers in `release-ledger.yaml`.
