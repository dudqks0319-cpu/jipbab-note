import { getIngredientCatalog } from "./ingredient-catalog.ts";
import {
  resolveLegacyRecipeCategory,
  type CanonicalRecipeCategoryId,
} from "./recipe-category-taxonomy.ts";

export interface LegacyRecipeMigrationInput {
  id: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  difficulty?: unknown;
  cooking_time?: unknown;
  servings?: unknown;
  thumbnail_url?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  source_id?: unknown;
  content_origin?: unknown;
  reviewed_for_beginner?: unknown;
}

export type RecipeMigrationStatus =
  | "v2_candidate"
  | "ready_for_editor_review"
  | "needs_structural_normalization"
  | "invalid_source_row";

export interface RecipeV2MigrationAuditRow {
  recipeId: string;
  title: string;
  sourceCategory: string;
  categoryStatus: "mapped" | "missing" | "unresolved";
  categoryId: CanonicalRecipeCategoryId | null;
  ingredientCount: number;
  ingredientShape: "missing" | "legacy_strings" | "structured" | "mixed_or_invalid";
  matchedIngredientCount: number;
  unmatchedIngredientCount: number;
  stepCount: number;
  completeV2StepCount: number;
  sourceLinked: boolean;
  conversionStatus: RecipeMigrationStatus;
  blockers: string[];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positiveNumber(value: unknown): boolean {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function difficultyIsValid(value: unknown): boolean {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3;
}

function normalizeIngredient(value: string): string {
  return value.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");
}

function ingredientAliasMap(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const item of getIngredientCatalog()) {
    for (const alias of [item.name, ...(item.aliases ?? [])]) {
      map.set(normalizeIngredient(alias), item.id);
    }
  }
  return map;
}

const INGREDIENT_ALIASES = ingredientAliasMap();

function ingredientName(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  const row = value as Record<string, unknown>;
  return text(row.name ?? row.displayName ?? row.display_name);
}

function ingredientHasQuantity(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return Boolean(text(row.amount ?? row.quantityText ?? row.quantity_text) || positiveNumber(row.quantityValue ?? row.quantity_value));
}

function ingredientShape(values: unknown[]): RecipeV2MigrationAuditRow["ingredientShape"] {
  if (values.length === 0) {
    return "missing";
  }
  if (values.every((value) => typeof value === "string" && text(value))) {
    return "legacy_strings";
  }
  if (values.every((value) => ingredientName(value) && ingredientHasQuantity(value))) {
    return "structured";
  }
  return "mixed_or_invalid";
}

function stepIsV2Complete(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  const duration = row.durationSecondsMin ?? row.duration_seconds_min ?? row.timerPresetSeconds ?? row.timer_preset_seconds ?? row.minutes;
  return Boolean(
    text(row.instruction ?? row.description ?? row.action) &&
      text(row.heatLevel ?? row.heat_level ?? row.heat) &&
      text(row.visualCue ?? row.visual_cue) &&
      positiveNumber(duration),
  );
}

export function auditLegacyRecipeForV2(input: LegacyRecipeMigrationInput): RecipeV2MigrationAuditRow {
  const recipeId = text(input.id);
  const title = text(input.title);
  const category = resolveLegacyRecipeCategory(input.category);
  const ingredients = Array.isArray(input.ingredients) ? input.ingredients : [];
  const steps = Array.isArray(input.steps) ? input.steps : [];
  const shape = ingredientShape(ingredients);
  const blockers: string[] = [];

  if (!recipeId) blockers.push("missing_recipe_id");
  if (!title) blockers.push("missing_title");
  if (!text(input.description)) blockers.push("missing_summary");
  if (category.status !== "mapped") blockers.push(`category_${category.status}`);
  if (!difficultyIsValid(input.difficulty)) blockers.push("missing_or_invalid_difficulty");
  if (!positiveNumber(input.servings)) blockers.push("missing_servings");
  if (!positiveNumber(input.cooking_time)) blockers.push("missing_total_time");
  if (!text(input.source_id)) blockers.push("source_ledger_missing");
  if (input.reviewed_for_beginner !== true) blockers.push("beginner_review_missing");

  if (shape === "missing") blockers.push("ingredients_missing");
  if (shape === "legacy_strings") blockers.push("legacy_ingredient_strings_need_editor_parse");
  if (shape === "mixed_or_invalid") blockers.push("ingredient_shape_invalid");

  const structuredNames = shape === "structured" ? ingredients.map(ingredientName) : [];
  const matchedIngredientCount = structuredNames.filter((name) =>
    INGREDIENT_ALIASES.has(normalizeIngredient(name)),
  ).length;
  const unmatchedIngredientCount =
    shape === "structured" ? structuredNames.length - matchedIngredientCount : ingredients.length;
  if (shape === "structured" && unmatchedIngredientCount > 0) {
    blockers.push("ingredient_catalog_match_missing");
  }

  const completeV2StepCount = steps.filter(stepIsV2Complete).length;
  if (steps.length === 0) blockers.push("steps_missing");
  if (steps.length > 0 && completeV2StepCount !== steps.length) blockers.push("step_v2_fields_missing");

  let conversionStatus: RecipeMigrationStatus;
  if (!recipeId || !title) {
    conversionStatus = "invalid_source_row";
  } else if (
    blockers.length === 0 &&
    shape === "structured" &&
    completeV2StepCount === steps.length
  ) {
    conversionStatus = "v2_candidate";
  } else if (
    category.status === "mapped" &&
    shape === "structured" &&
    completeV2StepCount === steps.length
  ) {
    conversionStatus = "ready_for_editor_review";
  } else {
    conversionStatus = "needs_structural_normalization";
  }

  return {
    recipeId,
    title,
    sourceCategory: category.source ?? "",
    categoryStatus: category.status,
    categoryId: category.categoryId,
    ingredientCount: ingredients.length,
    ingredientShape: shape,
    matchedIngredientCount,
    unmatchedIngredientCount,
    stepCount: steps.length,
    completeV2StepCount,
    sourceLinked: Boolean(text(input.source_id)),
    conversionStatus,
    blockers,
  };
}
