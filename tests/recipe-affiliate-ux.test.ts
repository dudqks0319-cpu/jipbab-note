import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("recipe detail uses a safe Coupang affiliate card contract", () => {
  const card = readFileSync("components/affiliate/CoupangAffiliateCard.tsx", "utf8");

  assert.match(card, /isCoupangPartnerUrl\(affiliateUrl\)/);
  assert.match(card, /return null/);
  assert.match(card, /rel="sponsored noopener noreferrer"/);
  assert.match(card, /제휴 링크가 포함될 수 있으며/);
  assert.doesNotMatch(card, /iframe|script|dangerouslySetInnerHTML/);
});

test("recipe shopping assistant only shows partner cards for missing ingredients", () => {
  const assistant = readFileSync("components/recipe/RecipeShoppingAssistant.tsx", "utf8");

  assert.match(assistant, /usePartnerLinks/);
  assert.match(assistant, /getCoupangPurchaseLink/);
  assert.match(assistant, /getIngredientPhotoUrl/);
  assert.match(assistant, /purchaseLink\.isPartnerLink/);
  assert.match(assistant, /CoupangAffiliateCard/);
  assert.match(assistant, /imageUrl=\{item\.imageUrl\}/);
  assert.match(assistant, /검증된 쿠팡 파트너스 링크가 있는 재료만 보여줍니다/);
});

test("recipe instruction view only renders media when a step image exists", () => {
  const instructionView = readFileSync("components/recipe/RecipeInstructionView.tsx", "utf8");

  assert.match(instructionView, /Boolean\(step\.imageUrl\)/);
  assert.doesNotMatch(instructionView, /사진 준비중/);
  assert.match(instructionView, /step\.imageAlt/);
  assert.match(instructionView, /RecipeImage/);
});
