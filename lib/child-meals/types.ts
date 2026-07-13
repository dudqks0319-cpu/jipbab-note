export const CHILD_MEAL_AUDIENCES = ["baby", "toddler"] as const;
export type ChildMealAudience = (typeof CHILD_MEAL_AUDIENCES)[number];

export const CHILD_MEAL_STAGE_CODES = [
  "baby_6_8",
  "baby_9_11",
  "toddler_12_17",
  "toddler_18_23",
  "toddler_24_29",
  "toddler_30_36",
  "toddler_24_36",
] as const;
export type ChildMealStageCode = (typeof CHILD_MEAL_STAGE_CODES)[number];

export const CHILD_TEXTURE_LEVELS = [
  "puree",
  "mashed",
  "soft_lumps",
  "soft_bite",
  "family_cut",
] as const;
export type ChildTextureLevel = (typeof CHILD_TEXTURE_LEVELS)[number];

export const CHILD_MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;
export type ChildMealType = (typeof CHILD_MEAL_TYPES)[number];

export const CHILD_ALLERGEN_CODES = [
  "egg",
  "milk",
  "wheat",
  "soy",
  "peanut",
  "tree_nut",
  "sesame",
  "buckwheat",
  "fish",
  "shellfish",
  "pork",
  "chicken",
  "beef",
  "peach",
  "tomato",
  "sulfite",
  "pine_nut",
] as const;
export type ChildAllergenCode = (typeof CHILD_ALLERGEN_CODES)[number];

export const CHILD_NUTRITION_ROLES = [
  "grain",
  "protein",
  "iron_source",
  "vegetable",
  "fruit",
  "dairy",
  "healthy_fat",
] as const;
export type ChildNutritionRole = (typeof CHILD_NUTRITION_ROLES)[number];

export const CHILD_SODIUM_STRATEGIES = [
  "no_added_salt",
  "child_portion_first",
  "low_sodium_product",
] as const;
export type ChildSodiumStrategy = (typeof CHILD_SODIUM_STRATEGIES)[number];

export const CHILD_STORAGE_POLICY_CODES = [
  "eat_now",
  "young_child_cooked_food",
  "young_child_rice",
  "recipe_specific",
] as const;
export type ChildStoragePolicyCode = (typeof CHILD_STORAGE_POLICY_CODES)[number];

export const CHILD_AGE_BANDS = ["24_29", "30_36"] as const;
export type ChildAgeBand = (typeof CHILD_AGE_BANDS)[number];

export const CHILD_TEXTURE_PREFERENCES = ["soft_bite", "family_cut"] as const;
export type ChildTexturePreference = (typeof CHILD_TEXTURE_PREFERENCES)[number];

export interface ChildServingShapeNote {
  ingredientName: string;
  instruction: string;
  required: boolean;
}

export interface RecipeChildGuidanceReview {
  status: "draft" | "editorial_review" | "cooking_test" | "approved" | "rejected";
  childFeedingReviewed: boolean;
  childFeedingReviewedAt: string | null;
  childFeedingReviewer: string | null;
  requirementsVerified: boolean;
}

export interface RecipeChildGuidance {
  id: string;
  recipeId: string;
  audience: ChildMealAudience;
  stageCode: ChildMealStageCode;
  minAgeMonths: number;
  maxAgeMonths: number;
  textureLevel: ChildTextureLevel;
  mealTypes: ChildMealType[];
  allergenCodes: ChildAllergenCode[];
  nutritionRoles: ChildNutritionRole[];
  chokingRiskFlags: string[];
  servingShapeNotes: ChildServingShapeNote[];
  sodiumStrategy: ChildSodiumStrategy;
  familySplitSupported: boolean;
  familySplitInstruction: string | null;
  freezerFriendly: boolean;
  freezerQualityDays: number | null;
  storagePolicyCode: ChildStoragePolicyCode;
  pickyEatingTip: string;
  caregiverNote: string;
  guidanceVersion: number;
  review: RecipeChildGuidanceReview;
}

export interface ChildMealSettings {
  schemaVersion: 1;
  enabled: boolean;
  preferredAudience: "family" | ChildMealAudience;
  ageBand: ChildAgeBand;
  texturePreference: ChildTexturePreference;
  excludedAllergenCodes: ChildAllergenCode[];
  preferFamilySplit: boolean;
  preferMaxActiveMinutes: 10 | 15 | 20 | null;
}

export const DEFAULT_CHILD_MEAL_SETTINGS: ChildMealSettings = {
  schemaVersion: 1,
  enabled: false,
  preferredAudience: "family",
  ageBand: "24_29",
  texturePreference: "soft_bite",
  excludedAllergenCodes: [],
  preferFamilySplit: true,
  preferMaxActiveMinutes: 10,
};

export type ChildMealFeedbackValue =
  | "ate_well"
  | "tasted"
  | "touched"
  | "not_ready";

export interface ChildMealFeedbackRecord {
  id: string;
  recipeId: string;
  value: ChildMealFeedbackValue;
  notes: string[];
  createdAt: string;
}
