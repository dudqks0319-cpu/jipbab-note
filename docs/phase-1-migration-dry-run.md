# Phase 1 recipe migration dry run

Generated: 2026-07-10T05:35:21.553Z

This is a read-only classification of the live public recipe rows. It does not execute SQL, assign evidence, publish a recipe, or infer missing category, quantity, timing, safety, or source facts.

## Result

- Live rows inspected: **1152**
- Complete v2 candidates: **0**
- Rows linked to recipe_sources: **0**
- Rows whose every step already has instruction, heat, duration, and visual cue: **0**
- Legacy string ingredients are reported for editor parsing and are never converted by this dry run.
- Ambiguous categories remain unresolved instead of being mapped by keyword guesswork.

## Conversion status

| Status | Rows |
|---|---:|
| needs_structural_normalization | 1152 |

## Ingredient shape

| Shape | Rows |
|---|---:|
| legacy_strings | 1148 |
| missing | 4 |

## Category resolution

| Resolution and source value | Rows |
|---|---:|
| mapped:반찬 | 577 |
| mapped:일품 | 171 |
| mapped:후식 | 142 |
| mapped:밥 | 120 |
| unresolved:국&찌개 | 105 |
| mapped:기타 | 37 |

## Blocking fields

| Blocker | Rows |
|---|---:|
| beginner_review_missing | 1152 |
| source_ledger_missing | 1152 |
| step_v2_fields_missing | 1151 |
| legacy_ingredient_strings_need_editor_parse | 1148 |
| missing_or_invalid_difficulty | 1146 |
| missing_servings | 1146 |
| missing_total_time | 1146 |
| category_unresolved | 105 |
| ingredients_missing | 4 |
| steps_missing | 1 |

## Rollout rule

The generated CSV is an editor queue, not an import payload. A row may be promoted to schema_version 2 only after its normalized ingredients and steps, source ledger, category, review evidence, and actual cooking test are independently recorded and validated. Production rollout remains blocked by the migration-history drift and restorable-backup requirement.
