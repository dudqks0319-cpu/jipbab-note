import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync("app/page.tsx", "utf8");
const starterSource = readFileSync("components/home/StarterActionCard.tsx", "utf8");
const fridgeSource = readFileSync("components/fridge/FridgeIllustration.tsx", "utf8");

test("home keeps the shared shelf-style fridge illustration", () => {
  assert.match(homeSource, /<FridgeIllustration ingredients=\{activeDisplayIngredients\}/);
  assert.doesNotMatch(homeSource, /CompactFridgeIngredientGrid/);
});

test("starter prioritizes ingredient choices and CTA before a truthful compact preview", () => {
  assert.match(starterSource, /aria-live="polite"/);
  assert.match(starterSource, /재료를 하나 이상 고르면 추천할 수 있어요/);
  assert.match(starterSource, /선택한 재료 \{selectedNames\.length\}개/);
  assert.match(starterSource, /data-testid="starter-fridge-preview"/);
  assert.match(starterSource, /h-36/);
  assert.match(starterSource, /fridge-freezer-board-animated\.png/);
  assert.ok(starterSource.indexOf('visibleStarterNames.map') < starterSource.indexOf('data-testid="starter-fridge-preview"'));
  assert.ok(starterSource.indexOf("이 재료로 메뉴 찾기") < starterSource.indexOf('data-testid="starter-fridge-preview"'));
  assert.doesNotMatch(starterSource, /hasSelection \? selectedNames : visibleStarterNames/);
});

test("starter compact preview uses real ingredient photos", () => {
  assert.match(starterSource, /getIngredientPhotoUrl/);
  assert.match(fridgeSource, /fridge-freezer-board-animated\.png/);
  assert.match(fridgeSource, /getIngredientPhotoUrl/);
});

test("restored ingredient controls keep mobile touch targets", () => {
  assert.match(starterSource, /className=\{`min-h-11 cursor-pointer/);
  assert.match(starterSource, /className=\{`flex min-h-12 w-full/);
});
