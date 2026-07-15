import type {
  RecipeDetailRecord,
  RecipeImageRightsStatus,
  RecipePublicationEvidence,
  RecipeRecord,
  RecipeReviewStatus,
} from "@/types";

export type DatabaseRecipePublicationRow = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  difficulty?: unknown;
  servings_base?: unknown;
  prep_time_minutes?: unknown;
  cook_time_minutes?: unknown;
  total_time_minutes?: unknown;
  thumbnail_url?: unknown;
  tools?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  storage_guide?: unknown;
  reheating_guide?: unknown;
  source_id?: unknown;
  review_status?: RecipeReviewStatus | unknown;
  reviewed_for_beginner?: unknown;
  beginner_reviewed_at?: unknown;
  actual_cooking_tested?: unknown;
  actual_cooking_tested_at?: unknown;
  food_safety_reviewed?: unknown;
  food_safety_reviewed_at?: unknown;
  image_rights_status?: RecipeImageRightsStatus | unknown;
  image_rights_reviewed_at?: unknown;
  source_reviewed_at?: unknown;
  published_at?: unknown;
  reviewer?: unknown;
};

type PublishedRecipeDetailRecord = RecipeDetailRecord & {
  publicationEvidence: RecipePublicationEvidence;
  cookingTime: number;
  totalMinutes: number;
  servings: number;
  ingredientDetails: NonNullable<RecipeDetailRecord["ingredientDetails"]>;
  safetyNotes: string[];
  sourceProvider: string;
  sourceTitle: string;
  sourceAttribution: string;
  sourceLicense: string;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

function isValidDateTime(value: unknown): value is string {
  return hasText(value) && Number.isFinite(Date.parse(value));
}

function hasIngredientAmount(value: Record<string, unknown>): boolean {
  return ["amount", "quantity", "quantityText", "quantity_text"].some((key) => hasText(value[key]));
}

function hasValidIngredients(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        hasText((item as Record<string, unknown>).name) &&
        hasIngredientAmount(item as Record<string, unknown>),
    )
  );
}

function hasValidTools(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.every(
      (item) =>
        hasText(item) ||
        (typeof item === "object" && item !== null && hasText((item as Record<string, unknown>).name)),
    )
  );
}

function hasStepDuration(value: Record<string, unknown>): boolean {
  return ["minutes", "durationSecondsMin", "duration_seconds_min", "timerPresetSeconds", "timer_preset_seconds"].some(
    (key) => isFiniteNumber(value[key], 0),
  );
}

function hasValidSteps(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const step = item as Record<string, unknown>;
      return (
        (hasText(step.instruction) || hasText(step.description) || hasText(step.action)) &&
        (hasText(step.heatLevel) || hasText(step.heat_level) || hasText(step.heat)) &&
        (hasText(step.visualCue) || hasText(step.visual_cue)) &&
        hasStepDuration(step)
      );
    })
  );
}

export function isDatabaseRecipePublicationApproved(row: DatabaseRecipePublicationRow): boolean {
  const imageRightsApproved = row.image_rights_status === "approved";
  const noImageApproved = row.image_rights_status === "no_image_approved";
  return (
    row.review_status === "approved" &&
    row.reviewed_for_beginner === true &&
    row.actual_cooking_tested === true &&
    row.food_safety_reviewed === true &&
    isValidDateTime(row.beginner_reviewed_at) &&
    isValidDateTime(row.actual_cooking_tested_at) &&
    isValidDateTime(row.food_safety_reviewed_at) &&
    isValidDateTime(row.image_rights_reviewed_at) &&
    isValidDateTime(row.source_reviewed_at) &&
    isValidDateTime(row.published_at) &&
    hasText(row.reviewer) &&
    hasText(row.title) &&
    hasText(row.description) &&
    hasText(row.category) &&
    isFiniteNumber(row.difficulty, 1) &&
    Number(row.difficulty) <= 3 &&
    isFiniteNumber(row.servings_base, 1) &&
    isFiniteNumber(row.prep_time_minutes, 0) &&
    isFiniteNumber(row.cook_time_minutes, 1) &&
    isFiniteNumber(row.total_time_minutes, 1) &&
    Number(row.total_time_minutes) >= Number(row.prep_time_minutes) + Number(row.cook_time_minutes) &&
    hasValidTools(row.tools) &&
    hasValidIngredients(row.ingredients) &&
    hasValidSteps(row.steps) &&
    hasText(row.storage_guide) &&
    hasText(row.reheating_guide) &&
    hasText(row.source_id) &&
    (noImageApproved || (imageRightsApproved && hasText(row.thumbnail_url)))
  );
}

export function toRecipePublicationEvidence(
  row: DatabaseRecipePublicationRow,
): RecipePublicationEvidence | null {
  if (!isDatabaseRecipePublicationApproved(row)) return null;
  return {
    reviewStatus: "approved",
    reviewedForBeginner: true,
    beginnerReviewedAt: String(row.beginner_reviewed_at),
    actualCookingTested: true,
    actualCookingTestedAt: String(row.actual_cooking_tested_at),
    foodSafetyReviewed: true,
    foodSafetyReviewedAt: String(row.food_safety_reviewed_at),
    imageRightsStatus: row.image_rights_status as "approved" | "no_image_approved",
    imageRightsReviewedAt: String(row.image_rights_reviewed_at),
    sourceRecorded: true,
    sourceReviewedAt: String(row.source_reviewed_at),
    publishedAt: String(row.published_at),
    reviewer: String(row.reviewer).trim(),
    requirementsVerified: true,
  };
}

export function isRecipePublicationApproved(recipe: RecipeRecord): boolean {
  return isRecipePublicationEvidenceApproved(recipe.publicationEvidence);
}

export function isRecipePublicationEvidenceApproved(
  evidence: RecipePublicationEvidence | null | undefined,
): evidence is RecipePublicationEvidence {
  return Boolean(
    evidence &&
      evidence.reviewStatus === "approved" &&
      evidence.reviewedForBeginner === true &&
      evidence.actualCookingTested === true &&
      evidence.foodSafetyReviewed === true &&
      evidence.sourceRecorded === true &&
      evidence.requirementsVerified === true &&
      [
        evidence.beginnerReviewedAt,
        evidence.actualCookingTestedAt,
        evidence.foodSafetyReviewedAt,
        evidence.imageRightsReviewedAt,
        evidence.sourceReviewedAt,
        evidence.publishedAt,
      ].every(isValidDateTime) &&
      hasText(evidence.reviewer) &&
      (evidence.imageRightsStatus === "approved" || evidence.imageRightsStatus === "no_image_approved"),
  );
}

export function isRecipeDetailPublicationApproved(
  recipe: RecipeDetailRecord,
): recipe is PublishedRecipeDetailRecord {
  return (
    isRecipePublicationApproved(recipe) &&
    isFiniteNumber(recipe.cookingTime, 1) &&
    isFiniteNumber(recipe.totalMinutes, 1) &&
    isFiniteNumber(recipe.servings, 1) &&
    Array.isArray(recipe.requiredTools) &&
    recipe.requiredTools.length >= 1 &&
    recipe.requiredTools.every(hasText) &&
    Array.isArray(recipe.ingredientDetails) &&
    recipe.ingredientDetails.length >= 3 &&
    recipe.ingredientDetails.every((ingredient) => hasText(ingredient.name) && hasText(ingredient.display)) &&
    Array.isArray(recipe.steps) &&
    recipe.steps.length >= 3 &&
    recipe.steps.every(
      (step) =>
        hasText(step.description) &&
        hasText(step.heat) &&
        isFiniteNumber(step.minutes, 0) &&
        hasText(step.visualCue) &&
        hasText(step.rescueTip),
    ) &&
    Array.isArray(recipe.safetyNotes) &&
    recipe.safetyNotes.length >= 1 &&
    recipe.safetyNotes.every(hasText) &&
    hasText(recipe.storageTip) &&
    hasText(recipe.reheatTip) &&
    hasText(recipe.sourceProvider) &&
    hasText(recipe.sourceTitle) &&
    hasText(recipe.sourceAttribution) &&
    hasText(recipe.sourceLicense)
  );
}

export function filterPublicationApprovedRecipes<TRecipe extends RecipeRecord>(recipes: TRecipe[]): TRecipe[] {
  return recipes.filter((recipe) => isRecipePublicationApproved(recipe));
}
