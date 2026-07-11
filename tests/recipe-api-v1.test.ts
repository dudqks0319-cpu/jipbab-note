import assert from "node:assert/strict";
import test from "node:test";

import { decodeRecipeCursor } from "../lib/api-v1-contract.ts";
import {
  buildApiV1ErrorEnvelope,
  buildApiV1SuccessEnvelope,
} from "../lib/api-v1-envelope.ts";
import {
  buildPublicRecipeListResult,
  buildPublicRecipeDetail,
  filterNormalizedPublicRecipeRows,
  sortPublicRecipeCards,
  type PublicRecipeListQuery,
  type PublicRecipeRow,
  type RecipeIngredientRow,
  type RecipeV1IngredientRow,
  type RecipeV1StepRow,
} from "../lib/recipe-api-v1-repository.ts";
import { recipeApiV1DetailToRecord } from "../lib/recipe-api-v1-client.ts";

const REVIEWED_AT = "2026-07-10T05:00:00.000Z";

function recipeRow(overrides: Partial<PublicRecipeRow> = {}): PublicRecipeRow {
  return {
    id: "a36e34ec-5f17-4e4a-8e07-246b8082447e",
    slug: "egg-soup",
    title: "달걀국",
    summary: "부드러운 달걀국",
    description: "부드러운 달걀국",
    category: "국",
    category_id: "soup",
    difficulty: 1,
    servings_base: 2,
    total_time_minutes: 12,
    thumbnail_url: "/images/recipes/egg-soup.png",
    ingredients: [
      { name: "달걀", amount: "2개" },
      { name: "양파", amount: "1/4개" },
      { name: "소금", amount: "1작은술" },
    ],
    steps: Array.from({ length: 3 }, (_, index) => ({
      instruction: `${index + 1}단계를 진행한다.`,
      heat_level: "low",
      duration_seconds_min: 60,
      visual_cue: "상태가 보인다.",
    })),
    tools: ["냄비"],
    source_id: "source-1",
    review_status: "approved",
    reviewed_for_beginner: true,
    beginner_reviewed_at: REVIEWED_AT,
    actual_cooking_tested: true,
    actual_cooking_tested_at: REVIEWED_AT,
    food_safety_reviewed: true,
    food_safety_reviewed_at: REVIEWED_AT,
    image_rights_status: "approved",
    image_rights_reviewed_at: REVIEWED_AT,
    source_reviewed_at: REVIEWED_AT,
    reviewer: "editor-1",
    published_at: REVIEWED_AT,
    prep_time_minutes: 2,
    cook_time_minutes: 10,
    storage_guide: "식혀 냉장 보관한다.",
    reheating_guide: "충분히 끓여 재가열한다.",
    schema_version: 2,
    ...overrides,
  };
}

function query(overrides: Partial<PublicRecipeListQuery> = {}): PublicRecipeListQuery {
  return {
    query: null,
    categoryId: null,
    difficulty: null,
    maxTotalTime: null,
    maxMissingIngredients: null,
    ingredientIds: [],
    excludeIngredientIds: [],
    sort: "recent",
    cursor: null,
    limit: 24,
    ...overrides,
  };
}

function ingredients(recipeId: string): RecipeIngredientRow[] {
  return [
    { recipe_id: recipeId, ingredient_id: "dairy-egg", optional: false, pantry_staple: false },
    { recipe_id: recipeId, ingredient_id: "veg-onion", optional: false, pantry_staple: false },
    { recipe_id: recipeId, ingredient_id: "season-salt", optional: false, pantry_staple: true },
  ];
}

test("API v1 cards include exact owned and missing ingredient reasons", () => {
  const row = recipeRow();
  const result = buildPublicRecipeListResult(
    [row],
    ingredients(row.id),
    query({ ingredientIds: ["dairy-egg"], maxMissingIngredients: 1 }),
    97,
  );

  assert.equal(result.recipes.length, 1);
  assert.equal(result.recipes[0].category.id, "soup");
  assert.equal(result.recipes[0].requiredIngredientCount, 2);
  assert.equal(result.recipes[0].ownedIngredientCount, 1);
  assert.deepEqual(result.recipes[0].tools, ["냄비"]);
  assert.deepEqual(result.recipes[0].missingIngredientIds, ["veg-onion"]);
  assert.equal(result.recipes[0].recommendationReason, "재료 1개만 더 있으면 만들 수 있어요.");
  assert.equal(result.nextCursor, null);
});

test("API v1 cards reject excluded ingredients and incomplete publication rows", () => {
  const approved = recipeRow();
  const legacy = recipeRow({
    id: "b36e34ec-5f17-4e4a-8e07-246b8082447e",
    schema_version: 1,
  });

  const excluded = buildPublicRecipeListResult(
    [approved],
    ingredients(approved.id),
    query({ excludeIngredientIds: ["veg-onion"] }),
    97,
  );
  const legacyResult = buildPublicRecipeListResult(
    [legacy],
    ingredients(legacy.id),
    query(),
    97,
  );

  assert.deepEqual(excluded.recipes, []);
  assert.deepEqual(legacyResult.recipes, []);
});

test("API v1 list emits an opaque keyset cursor when another row can follow", () => {
  const first = recipeRow();
  const second = recipeRow({
    id: "b36e34ec-5f17-4e4a-8e07-246b8082447e",
    slug: "tofu-side",
    title: "두부 반찬",
    category: "반찬",
    category_id: "side",
    published_at: "2026-07-09T05:00:00.000Z",
  });
  const result = buildPublicRecipeListResult(
    [first, second],
    [...ingredients(first.id), ...ingredients(second.id)],
    query({ limit: 1 }),
    5,
  );

  assert.equal(result.recipes.length, 1);
  assert.deepEqual(decodeRecipeCursor(result.nextCursor), {
    kind: "recent",
    publishedAt: first.published_at,
    id: first.id,
  });
});

test("API v1 list advances past a scan window containing only incomplete rows", () => {
  const first = recipeRow({ schema_version: 1 });
  const second = recipeRow({
    id: "b36e34ec-5f17-4e4a-8e07-246b8082447e",
    schema_version: 1,
    published_at: "2026-07-09T05:00:00.000Z",
  });
  const result = buildPublicRecipeListResult([], [], query({ limit: 1 }), 2, [first, second]);

  assert.deepEqual(result.recipes, []);
  assert.deepEqual(decodeRecipeCursor(result.nextCursor), {
    kind: "recent",
    publishedAt: second.published_at,
    id: second.id,
  });
});

test("API v1 card sorts cover recommendation, pantry fit, time, and recency", () => {
  const first = recipeRow();
  const second = recipeRow({
    id: "b36e34ec-5f17-4e4a-8e07-246b8082447e",
    title: "빠른 두부 반찬",
    prep_time_minutes: 1,
    cook_time_minutes: 4,
    total_time_minutes: 5,
    published_at: "2026-07-09T05:00:00.000Z",
  });
  const cards = buildPublicRecipeListResult(
    [first, second],
    [...ingredients(first.id), ...ingredients(second.id)],
    query({ ingredientIds: ["dairy-egg", "veg-onion"], limit: 10 }),
    20,
  ).recipes;

  assert.equal(sortPublicRecipeCards(cards, "fastest")[0].id, second.id);
  assert.equal(sortPublicRecipeCards(cards, "recent")[0].id, first.id);
  assert.equal(sortPublicRecipeCards(cards, "least-missing")[0].id, first.id);
  assert.equal(sortPublicRecipeCards(cards, "most-owned")[0].id, first.id);
  assert.equal(sortPublicRecipeCards(cards, "recommended")[0].id, second.id);
});

test("API v1 response envelopes expose request IDs without raw internals", () => {
  const success = buildApiV1SuccessEnvelope({ recipes: [] }, "request-1");
  const failure = buildApiV1ErrorEnvelope(
    "RATE_LIMITED",
    "요청이 많습니다.",
    "request-2",
  );

  assert.deepEqual(success, {
    data: { recipes: [] },
    meta: { requestId: "request-1" },
  });
  assert.deepEqual(failure, {
    error: {
      code: "RATE_LIMITED",
      message: "요청이 많습니다.",
      requestId: "request-2",
    },
  });
});

test("API v1 detail returns structured ingredients, steps, source, safety, and storage", () => {
  const row = recipeRow({
    version: 3,
    cuisine_type: "korean",
    safety_notes: ["달걀은 충분히 익힌다."],
  });
  const detailIngredients: RecipeV1IngredientRow[] = [
    {
      id: "ingredient-1",
      ingredient_id: "dairy-egg",
      group_type: "main",
      display_name: "달걀",
      quantity_value: 2,
      quantity_text: "2개",
      unit: "piece",
      preparation: "풀어 둔다.",
      optional: false,
      pantry_staple: false,
      sort_order: 0,
    },
    {
      id: "ingredient-2",
      ingredient_id: "veg-onion",
      group_type: "main",
      display_name: "양파",
      quantity_value: 0.25,
      quantity_text: "1/4개",
      unit: "piece",
      preparation: "얇게 썬다.",
      optional: false,
      pantry_staple: false,
      sort_order: 1,
    },
    {
      id: "ingredient-3",
      ingredient_id: "season-salt",
      group_type: "seasoning",
      display_name: "소금",
      quantity_value: 1,
      quantity_text: "1작은술",
      unit: "tsp",
      preparation: null,
      optional: false,
      pantry_staple: true,
      sort_order: 2,
    },
  ];
  const detailSteps: RecipeV1StepRow[] = Array.from({ length: 3 }, (_, index) => ({
    id: `step-${index + 1}`,
    step_order: index + 1,
    title: `${index + 1}단계`,
    instruction: "천천히 익힌다.",
    heat_level: "low",
    duration_seconds_min: 60,
    duration_seconds_max: 90,
    timer_preset_seconds: 60,
    visual_cue: "표면이 부드럽게 굳는다.",
    sound_cue: null,
    smell_cue: null,
    safety_note: "뜨거운 냄비를 조심한다.",
    recovery_tip: "너무 익으면 불을 끄고 물을 조금 넣는다.",
    image_url: "/images/recipes/egg-step.png",
  }));
  const detailUsages = detailIngredients.map((ingredient, index) => ({
    recipe_step_id: `step-${Math.min(index + 1, 3)}`,
    recipe_ingredient_id: ingredient.id,
    usage_text: "단계에서 사용한다.",
  }));
  const detailSource = {
    provider: "jipbab-note",
    external_id: null,
    title: "집밥노트 자체 작성",
    source_url: null,
    license: "app-owned",
    attribution: "집밥노트",
  };

  const detail = buildPublicRecipeDetail(
    row,
    detailIngredients,
    [
      {
        recipe_ingredient_id: "ingredient-2",
        substitute_ingredient_id: "veg-green-onion",
        substitute_text: "대파",
        ratio_text: "같은 부피",
        caution_text: null,
        sort_order: 0,
      },
    ],
    detailSteps,
    detailUsages,
    detailSource,
  );

  assert.ok(detail);
  assert.equal(detail.version, 3);
  assert.equal(detail.schemaVersion, 2);
  assert.equal(detail.ingredients[1].substitutions[0].ingredientId, "veg-green-onion");
  assert.equal(detail.steps[0].ingredientUsages[0].recipeIngredientId, "ingredient-1");
  assert.deepEqual(detail.safetyNotes, ["달걀은 충분히 익힌다."]);
  assert.equal(detail.storageGuide, "식혀 냉장 보관한다.");
  assert.equal(detail.source.license, "app-owned");

  const displayRecord = recipeApiV1DetailToRecord(detail);
  assert.equal(displayRecord.ingredientDetails?.[1]?.display, "1/4개");
  assert.equal(displayRecord.ingredientDetails?.[1]?.substitute, "대파 · 같은 부피");
  assert.equal(displayRecord.steps[0]?.heat, "low");
  assert.equal(displayRecord.steps[0]?.minutes, 1);
  assert.equal(displayRecord.steps[0]?.durationSecondsMin, 60);
  assert.equal(displayRecord.steps[0]?.timerPresetSeconds, 60);
  assert.equal(displayRecord.steps[0]?.rescueTip, "너무 익으면 불을 끄고 물을 조금 넣는다.");
  assert.deepEqual(displayRecord.safetyNotes, ["달걀은 충분히 익힌다."]);
  assert.equal(displayRecord.sourceAttribution, "집밥노트");

  const listIngredients = detailIngredients.map((ingredient) => ({ ...ingredient, recipe_id: row.id }));
  const listSteps = detailSteps.map((step) => ({ ...step, recipe_id: row.id }));
  const listUsages = detailUsages.map((usage) => ({ ...usage, recipe_id: row.id }));
  assert.deepEqual(
    filterNormalizedPublicRecipeRows(
      [row],
      listIngredients,
      listSteps,
      listUsages,
      [{ id: "source-1", ...detailSource }],
    ).map((recipe) => recipe.id),
    [row.id],
  );
  assert.deepEqual(
    filterNormalizedPublicRecipeRows(
      [row],
      listIngredients,
      listSteps,
      listUsages.slice(0, 2),
      [{ id: "source-1", ...detailSource }],
    ),
    [],
  );
});

test("API v1 detail fails closed when normalized recovery guidance is incomplete", () => {
  const row = recipeRow({ safety_notes: ["뜨거운 냄비를 조심한다."] });
  const detailIngredients = [
    "dairy-egg",
    "veg-onion",
    "season-salt",
  ].map((ingredientId, index): RecipeV1IngredientRow => ({
    id: `ingredient-${index}`,
    ingredient_id: ingredientId,
    group_type: "main",
    display_name: ingredientId,
    quantity_value: 1,
    quantity_text: "1개",
    unit: "piece",
    preparation: null,
    optional: false,
    pantry_staple: false,
    sort_order: index,
  }));
  const steps: RecipeV1StepRow[] = Array.from({ length: 3 }, (_, index) => ({
    id: `step-${index}`,
    step_order: index + 1,
    title: null,
    instruction: "익힌다.",
    heat_level: "low",
    duration_seconds_min: 60,
    duration_seconds_max: null,
    timer_preset_seconds: null,
    visual_cue: "익은 상태가 보인다.",
    sound_cue: null,
    smell_cue: null,
    safety_note: null,
    recovery_tip: index === 0 ? null : "불을 줄인다.",
    image_url: null,
  }));

  assert.equal(
    buildPublicRecipeDetail(
      row,
      detailIngredients,
      [],
      steps,
      detailIngredients.map((ingredient, index) => ({
        recipe_step_id: `step-${index}`,
        recipe_ingredient_id: ingredient.id,
        usage_text: "단계에서 사용한다.",
      })),
      {
      provider: "jipbab-note",
      external_id: null,
      title: "집밥노트 자체 작성",
      source_url: null,
      license: "app-owned",
      attribution: "집밥노트",
      },
    ),
    null,
  );
});
