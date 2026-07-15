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

test("FE-011 cook mode presents one large step with exact ingredients and one primary action", () => {
  assert.match(detailPage, /cookModeRollout\.enabled \? "#cook-mode" : "#instructions"/);
  assert.match(detailPage, /조리 시작/);
  assert.match(cookMode, /resolveRecipeCookStepIngredients/);
  assert.match(cookMode, /activeStep\.imageUrl/);
  assert.match(cookMode, /이 단계 재료/);
  assert.match(cookMode, /이 단계 완료하고 다음으로/);
  assert.match(cookMode, /요리 완성하기/);
  assert.match(cookMode, /text-\[21px\]/);
  assert.match(cookMode, /min-h-\[52px\]/);
  assert.match(cookMode, /minHeight: 52/);
  assert.match(cookMode, /minHeight: 56/);
  assert.match(cookMode, /aria-live="polite"/);
  assert.match(cookMode, /aria-current=.*'step'/);
});

test("FE-012 keeps one visible timer across steps with explicit cancel and restore guidance", () => {
  assert.match(cookMode, /role="timer"/);
  assert.match(cookMode, /text-\[40px\]/);
  assert.match(cookMode, /다른 단계로 이동해도 계속 계산해요/);
  assert.match(cookMode, /저장된 종료 시각으로 남은 시간을 복원합니다/);
  assert.match(cookMode, /한 번에 하나만 실행됩니다/);
  assert.match(cookMode, /타이머 취소/);
  assert.match(cookMode, /취소 후 시작/);
  assert.match(cookMode, /타이머가 이미 끝났습니다/);
});

test("FE-013 requests screen wake lock only after explicit consent and keeps a manual fallback", () => {
  assert.match(cookMode, /화면 꺼짐 방지 켜기/);
  assert.match(cookMode, /기본은 꺼짐/);
  assert.match(cookMode, /wakeLockConsentRef\.current = true/);
  assert.match(cookMode, /aria-pressed/);
  assert.match(cookMode, /visibilitychange/);
  assert.match(cookMode, /sentinel && !sentinel\.released/);
  assert.match(cookMode, /화면을 직접 켜 주세요/);
  assert.match(cookMode, /release/);
  assert.doesNotMatch(
    cookMode,
    /if \(!activeTimer \|\| !timerRunning\) return[\s\S]{0,600}wakeLock\?\.request/,
  );
});
