import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildRecipeRecommendationReason,
  calculateRecipeIngredientMatch,
  findExpiringMatchedIngredients,
  getEssentialMissingIngredients,
  rankRecipeRecommendations,
} from "../lib/matching.ts";
import { canonicalizeIngredientName, getIngredientAliasCount } from "../lib/ingredient-aliases.ts";
import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";
import { RECIPE_CATEGORIES } from "../types/index.ts";
import {
  getReadinessBadge,
  isBeginnerVerifiedRecipe,
  matchesRecipeQuickFilter,
} from "../lib/recipe-list-labels.ts";

test("calculateRecipeIngredientMatch keeps the existing match result shape", () => {
  const match = calculateRecipeIngredientMatch(["계란", "대파"], "계란 2개, 대파 1줄기, 간장 1큰술");

  assert.deepEqual(Object.keys(match).sort(), [
    "ingredientList",
    "matchRate",
    "matchedIngredients",
    "missingIngredients",
    "totalRecipeIngredients",
  ]);
  assert.equal(match.matchRate, 67);
  assert.deepEqual(match.matchedIngredients, ["계란", "대파"]);
  assert.deepEqual(match.missingIngredients, ["간장"]);
});

test("ranking prefers recipes with fewer missing ingredients at the same match rate", () => {
  const ranked = rankRecipeRecommendations(
    [
      { id: "many-missing", ingredients: "두부, 파, 간장, 고추" },
      { id: "few-missing", ingredients: "두부, 간장" },
    ],
    [{ name: "두부" }, { name: "파" }],
  );

  assert.equal(ranked[0].recipe.id, "few-missing");
  assert.equal(ranked[0].match.matchRate, ranked[1].match.matchRate);
  assert.ok(ranked[0].score.total > ranked[1].score.total);
});

test("ranking uses more available ingredients when match quality is otherwise tied", () => {
  const ranked = rankRecipeRecommendations(
    [
      { id: "one-ingredient", ingredients: "계란" },
      { id: "three-ingredients", ingredients: "계란, 파, 간장" },
    ],
    [{ name: "계란" }, { name: "파" }, { name: "간장" }],
  );

  assert.equal(ranked[0].recipe.id, "three-ingredients");
  assert.equal(ranked[0].match.matchRate, 100);
  assert.equal(ranked[1].match.matchRate, 100);
});

test("ranking lifts recipes that use ingredients expiring soon", () => {
  const ranked = rankRecipeRecommendations(
    [
      { id: "fresh-later", ingredients: "두부, 파" },
      { id: "use-soon", ingredients: "계란, 파" },
    ],
    [
      { name: "두부", expiryDate: "2026-04-30" },
      { name: "계란", expiryDate: "2026-04-23" },
      { name: "파", expiryDate: "2026-05-01" },
    ],
    new Date("2026-04-22T00:00:00+09:00"),
  );

  assert.equal(ranked[0].recipe.id, "use-soon");
  assert.ok(ranked[0].score.freshnessUrgencyPoints > ranked[1].score.freshnessUrgencyPoints);
});

test("ranking ignores invalid expiry metadata instead of adding freshness urgency", () => {
  const ranked = rankRecipeRecommendations(
    [{ id: "invalid-expiry", ingredients: "계란" }],
    [{ name: "계란", expiryDate: "not-a-date" }],
    new Date("2026-04-22T00:00:00+09:00"),
  );

  assert.equal(ranked[0].score.freshnessUrgencyPoints, 0);
});

test("curated beginner recipes keep structured amounts and visual cues", () => {
  const recipe = CURATED_JIPBAB_RECIPES.find((item) => item.id === "curated-doenjang-jjigae");

  assert.ok(recipe);
  assert.ok(recipe.ingredientDetails?.some((item) => item.name === "된장" && item.display === "2큰술"));
  assert.ok(recipe.measurementTips?.some((tip) => tip.includes("1큰술")));
  assert.ok(recipe.steps.some((step) => step.beginnerTip && step.visualCue));
});

test("curated recipe batch has competitive beginner coverage", () => {
  assert.ok(CURATED_JIPBAB_RECIPES.length >= 70);

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    assert.ok(recipe.ingredientDetails && recipe.ingredientDetails.length >= 4, recipe.id);
    assert.ok(recipe.measurementTips?.some((tip) => tip.includes("1큰술")), recipe.id);
    assert.ok(recipe.beginnerSummary && recipe.beginnerSummary.length >= 20, recipe.id);
    assert.ok(recipe.steps.length >= 4, recipe.id);
    assert.ok(recipe.steps.every((step) => step.beginnerTip && step.visualCue), recipe.id);
    assert.ok(
      recipe.ingredientDetails.some((ingredient) => /[0-9]/.test(ingredient.display)),
      recipe.id,
    );
  }
});

test("easy recipe expansion adds student-friendly child and home recipes", () => {
  const easyRecipes = CURATED_JIPBAB_RECIPES.filter((recipe) => recipe.id.startsWith("easy-"));
  const childRecipes = easyRecipes.filter((recipe) =>
    recipe.category === "아이반찬" || recipe.trustLabel.includes("아이"),
  );

  assert.ok(RECIPE_CATEGORIES.includes("아이반찬"));
  assert.equal(easyRecipes.length, 40);
  assert.ok(childRecipes.length >= 15);

  for (const recipe of easyRecipes) {
    assert.ok(recipe.beginnerSummary?.includes("초등학생이나 중학생"), recipe.id);
    assert.ok(recipe.steps.every((step) => step.beginnerTip && step.visualCue), recipe.id);
    assert.ok(recipe.sourceAttribution?.includes("만개의레시피식"), recipe.id);
  }
});

test("curated recipe thumbnails are local release-safe assets", () => {
  for (const recipe of CURATED_JIPBAB_RECIPES) {
    const thumbnailUrl = recipe.thumbnailUrl;

    assert.ok(thumbnailUrl, recipe.id);
    assert.ok(thumbnailUrl.startsWith("/images/recipes/"), recipe.id);
    assert.ok(
      existsSync(join(process.cwd(), "public", thumbnailUrl)),
      `${recipe.id} missing ${thumbnailUrl}`,
    );
  }
});

test("curated recipe thumbnails are documented in the recipe source ledger", () => {
  const sourceLedger = readFileSync(
    join(process.cwd(), "public/images/recipes/SOURCES.md"),
    "utf8",
  );

  assert.match(sourceLedger, /not copied from competitor apps/i);

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    const thumbnailUrl = recipe.thumbnailUrl;
    assert.ok(thumbnailUrl, recipe.id);

    const ledgerPath = thumbnailUrl.replace(/^\/images\/recipes\//, "");
    assert.ok(sourceLedger.includes(ledgerPath), `${recipe.id} missing ${ledgerPath}`);
  }
});

test("curated recipe guide images are local release-safe assets", () => {
  for (const recipe of CURATED_JIPBAB_RECIPES) {
    assert.ok(recipe.guideImageUrl, recipe.id);
    assert.ok(recipe.guideImageUrl.startsWith("/images/recipes/"), recipe.id);
    assert.ok(
      existsSync(join(process.cwd(), "public", recipe.guideImageUrl)),
      `${recipe.id} missing ${recipe.guideImageUrl}`,
    );
  }
});

test("curated recipe guide images are documented in the recipe source ledger", () => {
  const sourceLedger = readFileSync(
    join(process.cwd(), "public/images/recipes/SOURCES.md"),
    "utf8",
  );

  assert.match(sourceLedger, /Generated curated recipe card assets/i);
  assert.match(sourceLedger, /jipbab-curated\/guides\/\{recipe\.id\}-recipe-card\.svg/);

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    assert.ok(recipe.guideImageUrl, recipe.id);
  }
});

test("baby food category has stage-safe curated recipes", () => {
  const babyRecipes = CURATED_JIPBAB_RECIPES.filter((recipe) => recipe.category === "이유식");

  assert.ok(RECIPE_CATEGORIES.includes("이유식"));
  assert.ok(babyRecipes.length >= 8);

  for (const recipe of babyRecipes) {
    assert.match(recipe.name, /초기|중기|후기|완료기/);
    assert.ok(recipe.reviewedForBeginner, recipe.id);
    assert.ok(recipe.sourceAttribution?.includes("질병관리청"), recipe.id);
    assert.ok(recipe.beginnerSummary?.includes("소금") || recipe.measurementTips?.some((tip) => tip.includes("소금")), recipe.id);
    assert.ok(!recipe.ingredientList.some((item) => /꿀|소금|설탕|간장|고추장/.test(item)), recipe.id);
    assert.ok(recipe.steps.every((step) => step.beginnerTip && step.visualCue), recipe.id);
  }
});

test("recipe list quick filters expose beginner and ready states", () => {
  const curated = CURATED_JIPBAB_RECIPES.find((item) => item.id === "curated-soy-egg-rice");
  const recipe = {
    id: "curated-soy-egg-rice",
    name: "간장계란밥",
    category: "밥",
    method: "비비기",
    calories: "460",
    thumbnailUrl: curated?.thumbnailUrl ?? null,
    ingredients: "계란, 밥, 간장, 참기름, 김",
    hashTag: "",
    ingredientList: ["계란", "밥", "간장", "참기름", "김"],
    matchRate: 80,
    matchedIngredients: ["계란", "밥", "간장", "김"],
    missingIngredients: ["참기름"],
    totalRecipeIngredients: 5,
  };

  assert.equal(getReadinessBadge(0, 5).text, "바로 가능");
  assert.equal(getReadinessBadge(1, 4).text, "1개만 사면 가능");
  assert.equal(isBeginnerVerifiedRecipe(curated), true);
  assert.equal(matchesRecipeQuickFilter(recipe, curated, "one-more"), true);
  assert.equal(matchesRecipeQuickFilter(recipe, curated, "beginner"), true);
  assert.equal(matchesRecipeQuickFilter(recipe, curated, "ready"), false);
});

test("Korean ingredient aliases cover common home-cooking variants", () => {
  const match = calculateRecipeIngredientMatch(
    ["돼지고기 목살", "묵은지", "코인육수"],
    "돼지고기, 김치, 멸치육수, 간장",
  );

  assert.deepEqual(match.matchedIngredients, ["돼지고기", "김치", "멸치육수"]);
  assert.deepEqual(getEssentialMissingIngredients(match.missingIngredients), []);
});

test("ingredient alias dictionary normalizes beginner input variants", () => {
  assert.ok(getIngredientAliasCount() >= 100);
  assert.equal(canonicalizeIngredientName("달걀 10구"), "계란");
  assert.equal(canonicalizeIngredientName("고추가루"), "고춧가루");

  const match = calculateRecipeIngredientMatch(
    ["달걀", "고추가루"],
    "계란, 고춧가루",
  );

  assert.deepEqual(match.matchedIngredients, ["계란", "고춧가루"]);
  assert.deepEqual(match.missingIngredients, []);
});

test("recommendation reason explains ready and expiring contexts in Korean", () => {
  const expiring = findExpiringMatchedIngredients(
    ["두부", "파"],
    [
      { name: "두부", expiryDate: "2026-05-08" },
      { name: "대파", expiryDate: "2026-05-20" },
    ],
    new Date("2026-05-07T00:00:00+09:00"),
  );
  const reason = buildRecipeRecommendationReason({
    recipeName: "두부조림",
    matchedIngredients: ["두부", "파"],
    missingIngredients: ["간장"],
    expiringIngredients: expiring,
  });

  assert.deepEqual(expiring, ["두부"]);
  assert.match(reason, /두부 소진/);
  assert.match(reason, /지금 바로/);
});
