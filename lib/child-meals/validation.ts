import {
  CHILD_AGE_BANDS,
  CHILD_ALLERGEN_CODES,
  CHILD_MEAL_AUDIENCES,
  CHILD_TEXTURE_PREFERENCES,
  DEFAULT_CHILD_MEAL_SETTINGS,
  type ChildAgeBand,
  type ChildAllergenCode,
  type ChildMealSettings,
  type RecipeChildGuidance,
} from "./types.ts";

const childAgeBandSet = new Set<string>(CHILD_AGE_BANDS);
const childAllergenCodeSet = new Set<string>(CHILD_ALLERGEN_CODES);
const childMealAudienceSet = new Set<string>(CHILD_MEAL_AUDIENCES);
const childTexturePreferenceSet = new Set<string>(CHILD_TEXTURE_PREFERENCES);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePreferredMaxActiveMinutes(value: unknown): 10 | 15 | 20 | null {
  return value === 10 || value === 15 || value === 20 || value === null
    ? value
    : DEFAULT_CHILD_MEAL_SETTINGS.preferMaxActiveMinutes;
}

export function isChildAllergenCode(value: unknown): value is ChildAllergenCode {
  return typeof value === "string" && childAllergenCodeSet.has(value);
}

export function ageBandToRepresentativeMonths(ageBand: ChildAgeBand): number {
  return ageBand === "30_36" ? 33 : 27;
}

export function normalizeChildMealSettings(value: unknown): ChildMealSettings {
  if (!isObject(value)) {
    return DEFAULT_CHILD_MEAL_SETTINGS;
  }

  const preferredAudience =
    value.preferredAudience === "family" ||
    (typeof value.preferredAudience === "string" && childMealAudienceSet.has(value.preferredAudience))
      ? (value.preferredAudience as ChildMealSettings["preferredAudience"])
      : DEFAULT_CHILD_MEAL_SETTINGS.preferredAudience;
  const ageBand =
    typeof value.ageBand === "string" && childAgeBandSet.has(value.ageBand)
      ? (value.ageBand as ChildAgeBand)
      : DEFAULT_CHILD_MEAL_SETTINGS.ageBand;
  const texturePreference =
    typeof value.texturePreference === "string" && childTexturePreferenceSet.has(value.texturePreference)
      ? (value.texturePreference as ChildMealSettings["texturePreference"])
      : DEFAULT_CHILD_MEAL_SETTINGS.texturePreference;
  const excludedAllergenCodes = Array.isArray(value.excludedAllergenCodes)
    ? [...new Set(value.excludedAllergenCodes.filter(isChildAllergenCode))].slice(0, CHILD_ALLERGEN_CODES.length)
    : [];

  return {
    schemaVersion: 1,
    enabled: booleanOr(value.enabled, DEFAULT_CHILD_MEAL_SETTINGS.enabled),
    preferredAudience,
    ageBand,
    texturePreference,
    excludedAllergenCodes,
    preferFamilySplit: booleanOr(value.preferFamilySplit, DEFAULT_CHILD_MEAL_SETTINGS.preferFamilySplit),
    preferMaxActiveMinutes: normalizePreferredMaxActiveMinutes(value.preferMaxActiveMinutes),
  };
}

export function isChildGuidanceAgeEligible(
  guidance: Pick<RecipeChildGuidance, "minAgeMonths" | "maxAgeMonths">,
  ageMonths: number,
): boolean {
  return (
    Number.isInteger(ageMonths) &&
    ageMonths >= 6 &&
    ageMonths <= 72 &&
    ageMonths >= guidance.minAgeMonths &&
    ageMonths <= guidance.maxAgeMonths
  );
}

export function hasExcludedChildAllergen(
  guidance: { allergenCodes: readonly ChildAllergenCode[] },
  excludedAllergenCodes: readonly ChildAllergenCode[],
): boolean {
  if (excludedAllergenCodes.length === 0) return false;
  const excluded = new Set(excludedAllergenCodes);
  return guidance.allergenCodes.some((code) => excluded.has(code));
}

export function isChildGuidancePublicationApproved(
  guidance: Pick<
    RecipeChildGuidance,
    | "familySplitSupported"
    | "familySplitInstruction"
    | "servingShapeNotes"
    | "pickyEatingTip"
    | "caregiverNote"
    | "review"
  >,
): boolean {
  const review = guidance.review;
  return (
    review.status === "approved" &&
    review.childFeedingReviewed === true &&
    isIsoDateTime(review.childFeedingReviewedAt) &&
    Boolean(review.childFeedingReviewer?.trim()) &&
    review.requirementsVerified === true &&
    guidance.servingShapeNotes.length > 0 &&
    guidance.servingShapeNotes.every(
      (note) => note.ingredientName.trim().length > 0 && note.instruction.trim().length > 0,
    ) &&
    guidance.pickyEatingTip.trim().length > 0 &&
    guidance.caregiverNote.trim().length > 0 &&
    (!guidance.familySplitSupported || Boolean(guidance.familySplitInstruction?.trim()))
  );
}
