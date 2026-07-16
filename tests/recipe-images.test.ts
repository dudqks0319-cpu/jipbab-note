import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BEGINNER_RECIPE_SCENE_PATH_PREFIX,
  BEGINNER_RECIPE_POSTER_PATH_PREFIX,
  isBeginnerRecipeGeneratedImage,
  isBeginnerRecipePosterImage,
  isBeginnerRecipeSceneImage,
} from "../lib/recipe-images.ts";

test("beginner recipe poster image detection is scoped to generated poster assets", () => {
  assert.equal(BEGINNER_RECIPE_POSTER_PATH_PREFIX, "/images/recipes/beginner-posters/");
  assert.equal(
    isBeginnerRecipePosterImage(
      "/images/recipes/beginner-posters/recipe-poster__beginner-001__v001__16x9__ko-KR.svg",
    ),
    true,
  );
  assert.equal(isBeginnerRecipePosterImage("/images/recipes/jipbab-curated/soy-egg-rice.png"), false);
  assert.equal(isBeginnerRecipePosterImage("https://example.com/recipe-poster.svg"), false);
  assert.equal(isBeginnerRecipePosterImage(null), false);
});

test("beginner recipe scene image detection is scoped to generated scene assets", () => {
  assert.equal(BEGINNER_RECIPE_SCENE_PATH_PREFIX, "/images/recipes/beginner-scenes/");
  assert.equal(isBeginnerRecipeSceneImage("/images/recipes/beginner-scenes/beginner-001/cover.svg"), true);
  assert.equal(isBeginnerRecipeSceneImage("/images/recipes/beginner-scenes/beginner-001/step-01.svg"), true);
  assert.equal(isBeginnerRecipeSceneImage("/images/recipes/beginner-posters/recipe-poster__beginner-001__v001__16x9__ko-KR.svg"), false);
  assert.equal(isBeginnerRecipeGeneratedImage("/images/recipes/beginner-scenes/beginner-001/cover.svg"), true);
  assert.equal(isBeginnerRecipeGeneratedImage("/images/recipes/beginner-posters/recipe-poster__beginner-001__v001__16x9__ko-KR.svg"), true);
});

test("beginner generated images render contained instead of cropped on mobile recipe surfaces", () => {
  const homeSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const listSource = readFileSync(new URL("../app/recipe/page.tsx", import.meta.url), "utf8");
  const detailSource = readFileSync(new URL("../app/recipe/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(homeSource, /isBeginnerRecipeGeneratedImage/);
  assert.match(homeSource, /object-contain p-1/);
  assert.match(listSource, /isBeginnerRecipeGeneratedImage/);
  assert.match(listSource, /object-contain p-1/);
  assert.match(detailSource, /isBeginnerRecipeGeneratedImage/);
  assert.match(detailSource, /object-contain p-2/);
});

test("QA UX links and labels keep fridge to recipe flow explicit", () => {
  const fridgeSource = readFileSync(new URL("../app/fridge/page.tsx", import.meta.url), "utf8");
  const listSource = readFileSync(new URL("../app/recipe/page.tsx", import.meta.url), "utf8");
  const detailSource = readFileSync(new URL("../app/recipe/[id]/page.tsx", import.meta.url), "utf8");
  const instructionSource = readFileSync(new URL("../components/recipe/RecipeInstructionView.tsx", import.meta.url), "utf8");

  assert.match(fridgeSource, /\/recipe\?q=/);
  assert.match(fridgeSource, /이 재료로 요리/);
  assert.match(listSource, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(listSource, /showAdvancedFilters/);
  assert.match(detailSource, /재료 확인/);
  assert.match(instructionSource, /option\.label/);
});

test("app store demo mode avoids first-render hydration mismatch", () => {
  const demoModeSource = readFileSync(new URL("../hooks/useDemoMode.ts", import.meta.url), "utf8");

  assert.match(demoModeSource, /isDemoMode: false, ready: false/);
  assert.match(demoModeSource, /isDemoMode: params\.get\("demo"\) === "appstore", ready: true/);
  assert.match(demoModeSource, /useEffect/);
  assert.doesNotMatch(demoModeSource, /useMemo/);
});
