import assert from "node:assert/strict";
import test from "node:test";

import { auditLegacyRecipeForV2 } from "../lib/recipe-v2-migration-audit.ts";

test("legacy string recipes are reported without inferred ingredient conversion", () => {
  const result = auditLegacyRecipeForV2({
    id: "legacy-1",
    title: "된장국",
    description: "간단한 국",
    category: "국&찌개",
    difficulty: null,
    cooking_time: null,
    servings: null,
    ingredients: ["된장 1큰술", "양파 1/2개"],
    steps: [{ order: 1, description: "끓인다" }],
    source_id: null,
    reviewed_for_beginner: false,
  });

  assert.equal(result.categoryStatus, "unresolved");
  assert.equal(result.ingredientShape, "legacy_strings");
  assert.equal(result.matchedIngredientCount, 0);
  assert.equal(result.unmatchedIngredientCount, 2);
  assert.equal(result.completeV2StepCount, 0);
  assert.equal(result.conversionStatus, "needs_structural_normalization");
  assert.ok(result.blockers.includes("legacy_ingredient_strings_need_editor_parse"));
  assert.ok(result.blockers.includes("step_v2_fields_missing"));
});

test("a fully structured and evidenced row becomes a v2 candidate", () => {
  const result = auditLegacyRecipeForV2({
    id: "structured-1",
    title: "달걀국",
    description: "부드러운 달걀국",
    category: "국",
    difficulty: 1,
    cooking_time: 12,
    servings: 2,
    ingredients: [
      { name: "달걀", amount: "2개" },
      { name: "대파", quantity_value: 10, unit: "g" },
      { name: "국간장", amount: "1작은술" },
    ],
    steps: [
      {
        instruction: "육수를 끓인다.",
        heat_level: "medium",
        duration_seconds_min: 180,
        visual_cue: "가장자리가 끓는다.",
      },
      {
        instruction: "달걀을 넣는다.",
        heat_level: "low",
        timer_preset_seconds: 60,
        visual_cue: "달걀이 부드럽게 익는다.",
      },
    ],
    source_id: "source-1",
    reviewed_for_beginner: true,
  });

  assert.equal(result.categoryId, "soup");
  assert.equal(result.ingredientShape, "structured");
  assert.equal(result.matchedIngredientCount, 3);
  assert.equal(result.unmatchedIngredientCount, 0);
  assert.equal(result.completeV2StepCount, 2);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.conversionStatus, "v2_candidate");
});

test("unknown canonical ingredients require editor review instead of fuzzy matching", () => {
  const result = auditLegacyRecipeForV2({
    id: "structured-2",
    title: "테스트 반찬",
    description: "테스트 설명",
    category: "반찬",
    difficulty: 2,
    cooking_time: 10,
    servings: 1,
    ingredients: [{ name: "양파맛가공품", amount: "1개" }],
    steps: [
      {
        instruction: "익힌다.",
        heat: "medium",
        minutes: 2,
        visualCue: "표면이 익는다.",
      },
    ],
    source_id: "source-2",
    reviewed_for_beginner: true,
  });

  assert.equal(result.matchedIngredientCount, 0);
  assert.equal(result.unmatchedIngredientCount, 1);
  assert.ok(result.blockers.includes("ingredient_catalog_match_missing"));
  assert.equal(result.conversionStatus, "ready_for_editor_review");
});

test("invalid source rows never enter a conversion queue as ready", () => {
  const result = auditLegacyRecipeForV2({
    id: "",
    title: "",
    category: "밥",
    ingredients: [],
    steps: [],
  });

  assert.equal(result.conversionStatus, "invalid_source_row");
  assert.ok(result.blockers.includes("missing_recipe_id"));
  assert.ok(result.blockers.includes("missing_title"));
});
