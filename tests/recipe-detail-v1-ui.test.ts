import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailPage = readFileSync(
  new URL("../app/recipe/[id]/page.tsx", import.meta.url),
  "utf8",
);
const instructionView = readFileSync(
  new URL("../components/recipe/RecipeInstructionView.tsx", import.meta.url),
  "utf8",
);
const cookMode = readFileSync(
  new URL("../components/recipe/RecipeCookMode.tsx", import.meta.url),
  "utf8",
);
const shoppingAssistant = readFileSync(
  new URL("../components/recipe/RecipeShoppingAssistant.tsx", import.meta.url),
  "utf8",
);

test("FE-007 detail fails closed and renders only normalized API source fields", () => {
  assert.match(detailPage, /parseRecipeApiV1Detail\(detail\)/);
  assert.match(detailPage, /recipe\.sourceTitle/);
  assert.match(detailPage, /recipe\.sourceAttribution/);
  assert.match(detailPage, /recipe\.sourceLicense/);
  assert.doesNotMatch(detailPage, /출처 표시 없음|라이선스 표시 없음/);
});

test("FE-007 instructions expose API safety and recovery without text-derived tool or heat labels", () => {
  assert.match(instructionView, /step\.safetyNote/);
  assert.match(instructionView, /안전:/);
  assert.match(instructionView, /step\.rescueTip/);
  assert.match(instructionView, /막혔을 때:/);
  assert.match(cookMode, /activeStep\.safetyNote/);
  assert.match(cookMode, /막혔을 때:/);
  assert.doesNotMatch(cookMode, /망했어요:/);
  assert.doesNotMatch(instructionView, /function getStepTools/);
  assert.doesNotMatch(instructionView, /description\.includes\(/);
});

test("FE-009 shopping UI separates exact, alias, reviewed substitute, and unresolved states", () => {
  assert.match(shoppingAssistant, /matchRecipeIngredientsToInventory/);
  assert.match(shoppingAssistant, /정확히 일치/);
  assert.match(shoppingAssistant, /같은 재료 · 별칭/);
  assert.match(shoppingAssistant, /검수된 대체 재료/);
  assert.match(shoppingAssistant, /판정 보류/);
  assert.doesNotMatch(shoppingAssistant, /calculateRecipeIngredientMatch/);
});
