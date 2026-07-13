import assert from "node:assert/strict";
import test from "node:test";

import {
  ageBandToRepresentativeMonths,
  hasExcludedChildAllergen,
  isChildGuidanceAgeEligible,
  isChildGuidancePublicationApproved,
  normalizeChildMealSettings,
} from "../lib/child-meals/validation.ts";
import { DEFAULT_CHILD_MEAL_SETTINGS, type RecipeChildGuidance } from "../lib/child-meals/types.ts";

test("child meal settings recover from invalid or privacy-expanding data", () => {
  assert.deepEqual(normalizeChildMealSettings(null), DEFAULT_CHILD_MEAL_SETTINGS);

  assert.deepEqual(
    normalizeChildMealSettings({
      enabled: true,
      preferredAudience: "toddler",
      ageBand: "30_36",
      texturePreference: "family_cut",
      excludedAllergenCodes: ["egg", "egg", "not-real", "milk"],
      preferFamilySplit: false,
      preferMaxActiveMinutes: 15,
      exactDateOfBirth: "2024-01-01",
      childName: "저장하면 안 됨",
    }),
    {
      schemaVersion: 1,
      enabled: true,
      preferredAudience: "toddler",
      ageBand: "30_36",
      texturePreference: "family_cut",
      excludedAllergenCodes: ["egg", "milk"],
      preferFamilySplit: false,
      preferMaxActiveMinutes: 15,
    },
  );
});

test("age bands map to bounded representative months", () => {
  assert.equal(ageBandToRepresentativeMonths("24_29"), 27);
  assert.equal(ageBandToRepresentativeMonths("30_36"), 33);
});

test("child guidance applies age and allergen hard filters", () => {
  const guidance = {
    minAgeMonths: 24,
    maxAgeMonths: 36,
    allergenCodes: ["egg", "soy"],
  } as const;

  assert.equal(isChildGuidanceAgeEligible(guidance, 24), true);
  assert.equal(isChildGuidanceAgeEligible(guidance, 36), true);
  assert.equal(isChildGuidanceAgeEligible(guidance, 23), false);
  assert.equal(isChildGuidanceAgeEligible(guidance, 37), false);
  assert.equal(hasExcludedChildAllergen(guidance, ["milk"]), false);
  assert.equal(hasExcludedChildAllergen(guidance, ["egg"]), true);
});

function approvedGuidance(): RecipeChildGuidance {
  return {
    id: "guidance-1",
    recipeId: "recipe-1",
    audience: "toddler",
    stageCode: "toddler_24_36",
    minAgeMonths: 24,
    maxAgeMonths: 36,
    textureLevel: "soft_bite",
    mealTypes: ["dinner"],
    allergenCodes: ["egg"],
    nutritionRoles: ["protein"],
    chokingRiskFlags: [],
    servingShapeNotes: [
      {
        ingredientName: "달걀",
        instruction: "가운데까지 완전히 익혀 부드러운 작은 조각으로 제공한다.",
        required: true,
      },
    ],
    sodiumStrategy: "child_portion_first",
    familySplitSupported: true,
    familySplitInstruction: "아이 몫을 먼저 덜고 어른 몫만 간한다.",
    freezerFriendly: false,
    freezerQualityDays: null,
    storagePolicyCode: "young_child_cooked_food",
    pickyEatingTip: "익숙한 음식과 소량을 함께 둔다.",
    caregiverNote: "앉은 상태에서 보호자가 지켜본다.",
    guidanceVersion: 1,
    review: {
      status: "approved",
      childFeedingReviewed: true,
      childFeedingReviewedAt: "2026-07-11T05:00:00.000Z",
      childFeedingReviewer: "reviewer@example.com",
      requirementsVerified: true,
    },
  };
}

test("child guidance publication requires reviewed safety copy and family split instruction", () => {
  const guidance = approvedGuidance();
  assert.equal(isChildGuidancePublicationApproved(guidance), true);

  assert.equal(
    isChildGuidancePublicationApproved({
      ...guidance,
      familySplitInstruction: null,
    }),
    false,
  );
  assert.equal(
    isChildGuidancePublicationApproved({
      ...guidance,
      review: { ...guidance.review, childFeedingReviewed: false },
    }),
    false,
  );
});
