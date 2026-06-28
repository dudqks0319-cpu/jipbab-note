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
import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";
import {
  getReadinessBadge,
  isBeginnerVerifiedRecipe,
  matchesRecipeQuickFilter,
} from "../lib/recipe-list-labels.ts";
import {
  matchesRecipeListFilters,
  sortRecipeListRecipes,
} from "../lib/recipe-list-filters.ts";
import { suggestIngredientCategory } from "../lib/ingredient-category.ts";
import { getIngredientPhotoUrl } from "../lib/utils.ts";

const DISALLOWED_STEP_IMAGE_PATTERNS = [
  /\/beginner-scenes\//,
  /\/beginner-recipe-guides\//,
  /\/beginner-imagegen-posters\//,
  /-recipe-poster\.(png|svg)$/i,
  /\.svg$/i,
];

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
  assert.deepEqual(match.matchedIngredients, ["계란", "파"]);
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

test("ranking adds beginner fit points for easy release recipes", () => {
  const ranked = rankRecipeRecommendations(
    [
      { id: "plain", ingredients: "계란, 밥" },
      {
        id: "beginner-safe",
        ingredients: "계란, 밥",
        beginnerScore: 92,
        difficultyLevel: 1,
        totalMinutes: 8,
        requiredTools: ["그릇", "숟가락"],
        noFire: true,
        fallbackMeal: "짜면 밥을 더 넣어 비빔밥처럼 먹습니다.",
      },
    ],
    [{ name: "계란" }, { name: "밥" }],
  );

  assert.equal(ranked[0].recipe.id, "beginner-safe");
  assert.ok(ranked[0].score.beginnerFitPoints > ranked[1].score.beginnerFitPoints);
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
  const recipe = CURATED_JIPBAB_RECIPES.find((item) => item.name === "된장찌개");

  assert.ok(recipe);
  assert.ok(recipe.ingredientDetails?.some((item) => item.name === "된장" && item.display === "2큰술"));
  assert.ok(recipe.measurementTips?.some((tip) => tip.includes("1큰술")));
  assert.ok(recipe.steps.some((step) => step.beginnerTip && step.visualCue));
});

test("curated recipe batch has competitive beginner coverage", () => {
  assert.ok(CURATED_JIPBAB_RECIPES.length >= 100);

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    assert.ok(recipe.ingredientDetails && recipe.ingredientDetails.length >= 3, recipe.id);
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

test("App Store QA thumbnail fixes use menu-specific food photos", () => {
  const expectedThumbnails = new Map([
    ["달걀국", "/images/recipes/beginner-food-photos/beginner-004-egg-drop-soup.png"],
    ["햄야채볶음밥", "/images/recipes/beginner-food-photos/beginner-016-ham-vegetable-fried-rice.png"],
    ["감자국", "/images/recipes/beginner-food-photos/beginner-034-gamja-guk.png"],
    ["참치김치찌개", "/images/recipes/beginner-food-photos/beginner-047-tuna-kimchi-jjigae.png"],
    ["스팸김치볶음", "/images/recipes/beginner-food-photos/beginner-049-spam-kimchi-bokkeum.png"],
    ["어묵탕", "/images/recipes/beginner-food-photos/beginner-052-eomuk-tang.png"],
  ]);

  for (const [recipeName, thumbnailUrl] of expectedThumbnails) {
    const recipe = CURATED_JIPBAB_RECIPES.find((item) => item.name === recipeName);
    assert.ok(recipe, recipeName);
    assert.equal(recipe.thumbnailUrl, thumbnailUrl, recipeName);
    assert.ok(existsSync(join(process.cwd(), "public", thumbnailUrl)), `${recipeName} missing ${thumbnailUrl}`);
  }
});

test("curated recipe instruction steps do not require unverified images", () => {
  for (const recipe of CURATED_JIPBAB_RECIPES) {
    assert.ok(recipe.steps.length > 0, recipe.id);
    for (const step of recipe.steps) {
      if (!step.imageUrl) {
        assert.equal(step.imageUrl, null, `${recipe.id} step ${step.index} uses an empty imageUrl`);
        continue;
      }
      assert.ok(step.imageUrl.startsWith("/images/recipes/"), `${recipe.id} step ${step.index} uses ${step.imageUrl}`);
      assert.equal(
        DISALLOWED_STEP_IMAGE_PATTERNS.some((pattern) => pattern.test(step.imageUrl ?? "")),
        false,
        `${recipe.id} step ${step.index} still uses old/card image ${step.imageUrl}`,
      );
      assert.ok(
        existsSync(join(process.cwd(), "public", step.imageUrl)),
        `${recipe.id} step ${step.index} missing ${step.imageUrl}`,
      );
    }
  }
});

test("all curated recipe and ingredient image references resolve to local assets", () => {
  const imageRefs: Array<{ owner: string; url: string }> = [];

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    for (const [field, url] of Object.entries({
      thumbnailUrl: recipe.thumbnailUrl,
      recipePosterImageUrl: recipe.recipePosterImageUrl,
      recipeGuideImageUrl: recipe.recipeGuideImageUrl,
      recipePrepImageUrl: recipe.recipePrepImageUrl,
      recipeStepsImageUrl: recipe.recipeStepsImageUrl,
    })) {
      if (url) {
        imageRefs.push({ owner: `${recipe.id}.${field}`, url });
      }
    }

    for (const step of recipe.steps) {
      if (step.imageUrl) {
        imageRefs.push({ owner: `${recipe.id}.step.${step.index}`, url: step.imageUrl });
      }
    }

    const ingredients = recipe.ingredientDetails?.length
      ? recipe.ingredientDetails.map((ingredient) => ingredient.name)
      : recipe.ingredientList;
    for (const ingredientName of ingredients) {
      const category = suggestIngredientCategory(ingredientName, "채소");
      const url = getIngredientPhotoUrl(ingredientName, category);
      imageRefs.push({ owner: `${recipe.id}.ingredient.${ingredientName}`, url });

      if (url.includes("dumpling-shop")) {
        assert.match(ingredientName, /만두/, `${recipe.id} maps ${ingredientName} to dumpling image`);
      }
    }
  }

  assert.ok(imageRefs.length > 700, "expected broad recipe and ingredient image coverage");
  for (const { owner, url } of imageRefs) {
    assert.ok(url.startsWith("/images/"), `${owner} uses non-local image ${url}`);
    assert.ok(existsSync(join(process.cwd(), "public", url)), `${owner} missing ${url}`);
  }
});

test("curated beginner recipes keep unverified visual guide images disabled", () => {
  const beginnerRecipes = CURATED_JIPBAB_RECIPES.filter((recipe) =>
    recipe.slug?.startsWith("beginner-"),
  );
  const sourceLedger = readFileSync(
    join(process.cwd(), "public/images/recipes/SOURCES.md"),
    "utf8",
  );

  assert.equal(beginnerRecipes.length, 120);
  assert.ok(sourceLedger.includes("beginner-recipe-guides/*.png"));
  assert.ok(sourceLedger.includes("beginner-recipe-guides/prep/*.png"));
  assert.ok(sourceLedger.includes("beginner-recipe-guides/steps/*.png"));

  for (const recipe of beginnerRecipes) {
    assert.equal(recipe.recipeGuideImageUrl, null, `${recipe.id} should not expose an unverified guide image`);
    assert.equal(recipe.recipePrepImageUrl, null, `${recipe.id} should not expose an unverified prep image`);
    assert.equal(recipe.recipeStepsImageUrl, null, `${recipe.id} should not expose an unverified steps image`);
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
    if (ledgerPath.startsWith("beginner-posters/")) {
      assert.ok(sourceLedger.includes("beginner-posters/manifest.json"), recipe.id);
      assert.ok(sourceLedger.includes("beginner-posters/recipe-poster__*.svg"), recipe.id);
      continue;
    }
    if (ledgerPath.startsWith("beginner-scenes/")) {
      assert.ok(sourceLedger.includes("beginner-scenes/manifest.json"), recipe.id);
      assert.ok(sourceLedger.includes("beginner-scenes/{recipeSlug}/"), recipe.id);
      continue;
    }
    if (ledgerPath.startsWith("beginner-food-photos/")) {
      assert.ok(sourceLedger.includes("beginner-food-photos/*.png"), recipe.id);
      assert.match(sourceLedger, /finished-dish food photos only/i);
      continue;
    }
    assert.ok(sourceLedger.includes(ledgerPath), `${recipe.id} missing ${ledgerPath}`);
  }
});

test("recipe list quick filters expose beginner and ready states", () => {
  const curated = CURATED_JIPBAB_RECIPES.find((item) => item.name === "계란간장밥");
  const recipe = {
    id: curated?.id ?? "beginner-recipe-001",
    name: "계란간장밥",
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
  assert.equal(matchesRecipeQuickFilter(recipe, curated, "quick"), true);
  assert.equal(matchesRecipeQuickFilter(recipe, curated, "ready"), false);
});

test("recipe list filters cover difficulty, time, tools, fridge fit, and beginner sorting", () => {
  const base = {
    name: "계란간장밥",
    category: "계란요리",
    method: "비비기",
    calories: "420",
    thumbnailUrl: null,
    ingredients: "계란, 밥, 간장",
    hashTag: "",
    ingredientList: ["계란", "밥", "간장"],
    matchRate: 100,
    matchedIngredients: ["계란", "밥", "간장"],
    missingIngredients: [],
    totalRecipeIngredients: 3,
  };
  const readyRecipe = {
    ...base,
    id: "ready-beginner",
    difficultyLevel: 1 as const,
    totalMinutes: 8,
    beginnerScore: 94,
    requiredTools: ["그릇", "숟가락"],
    noFire: true,
    microwave: false,
  };
  const microwaveRecipe = {
    ...base,
    id: "microwave",
    name: "전자레인지 계란찜",
    difficultyLevel: 2 as const,
    totalMinutes: 12,
    beginnerScore: 90,
    requiredTools: ["전자레인지", "전자레인지용 그릇"],
    noFire: true,
    microwave: true,
    missingIngredients: ["물"],
    matchRate: 75,
  };
  const slowRecipe = {
    ...base,
    id: "slow",
    name: "느린 조림",
    difficultyLevel: 3 as const,
    totalMinutes: 35,
    beginnerScore: 70,
    requiredTools: ["냄비"],
    noFire: false,
    microwave: false,
    missingIngredients: ["간장", "설탕", "대파"],
    matchRate: 40,
  };

  assert.equal(
    matchesRecipeListFilters(readyRecipe, {
      difficulty: "level-1",
      time: "10",
      tool: "no-fire",
      fridge: "ready",
    }),
    true,
  );
  assert.equal(
    matchesRecipeListFilters(slowRecipe, {
      difficulty: "level-2",
      time: "20",
      tool: "all",
      fridge: "almost",
    }),
    false,
  );
  assert.equal(
    matchesRecipeListFilters(microwaveRecipe, {
      difficulty: "level-2",
      time: "15",
      tool: "microwave",
      fridge: "almost",
    }),
    true,
  );

  assert.deepEqual(
    sortRecipeListRecipes([slowRecipe, microwaveRecipe, readyRecipe], "beginner-score").map((recipe) => recipe.id),
    ["ready-beginner", "microwave", "slow"],
  );
  assert.deepEqual(
    sortRecipeListRecipes([slowRecipe, microwaveRecipe, readyRecipe], "missing").map((recipe) => recipe.id),
    ["ready-beginner", "microwave", "slow"],
  );
});

test("recipe page hides low-data cuisine tabs from the launch category rail", () => {
  const typesSource = readFileSync(new URL("../types/index.ts", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("../app/recipe/page.tsx", import.meta.url), "utf8");
  const detailSource = readFileSync(new URL("../app/recipe/[id]/page.tsx", import.meta.url), "utf8");
  const apiSource = readFileSync(new URL("../app/api/recipes/route.ts", import.meta.url), "utf8");

  assert.match(typesSource, /DISPLAY_RECIPE_CATEGORIES/);
  assert.match(typesSource, /"국·찌개"/);
  assert.match(typesSource, /"초보가능"/);
  assert.match(typesSource, /"10분요리"/);
  assert.doesNotMatch(typesSource.slice(typesSource.indexOf("DISPLAY_RECIPE_CATEGORIES")), /"한식"|"중식"|"양식"|"일식"|"디저트"/);
  assert.match(pageSource, /visibleCategories/);
  assert.match(pageSource, /DISPLAY_CATEGORY_QUICK_FILTERS/);
  assert.match(pageSource, /setQuickFilter/);
  assert.match(pageSource, /difficultyFilter/);
  assert.match(pageSource, /timeFilter/);
  assert.match(pageSource, /toolFilter/);
  assert.match(pageSource, /fridgeFilter/);
  assert.match(pageSource, /sortMode/);
  assert.match(pageSource, /matchesRecipeListFilters/);
  assert.match(pageSource, /sortRecipeListRecipes/);
  assert.match(detailSource, /getStringField\(record, "action"\)/);
  assert.match(detailSource, /getStringField\(record, "heat"\)/);
  assert.match(detailSource, /getNumberField\(record, "minutes", "minute", "duration_minutes"\)/);
  assert.match(detailSource, /common_mistake/);
  assert.match(detailSource, /rescue_tip/);
  assert.match(apiSource, /categoryCounts/);
  assert.match(apiSource, /normalizeDisplayCategory/);
  assert.match(apiSource, /counts\.초보가능/);
  assert.match(apiSource, /counts\['10분요리'\]/);

  const hookSource = readFileSync(new URL("../hooks/useRecipes.ts", import.meta.url), "utf8");
  assert.match(hookSource, /VIRTUAL_CATEGORY_LABELS/);
  assert.match(hookSource, /counts\.초보가능/);
  assert.match(hookSource, /counts\["10분요리"\]/);
  assert.doesNotMatch(hookSource, /normalizeCategoryCounts\(payload\.categoryCounts,\s*getCuratedFallbackCategoryCounts/);
});

test("Korean ingredient aliases cover common home-cooking variants", () => {
  const match = calculateRecipeIngredientMatch(
    ["돼지고기 목살", "묵은지", "코인육수"],
    "돼지고기, 김치, 멸치육수, 간장",
  );

  assert.deepEqual(match.matchedIngredients, ["돼지고기", "김치", "멸치육수"]);
  assert.deepEqual(getEssentialMissingIngredients(match.missingIngredients), []);
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
