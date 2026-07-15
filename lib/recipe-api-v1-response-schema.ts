import {
  canonicalRecipeCategoryLabel,
  isCanonicalRecipeCategoryId,
} from "./recipe-category-taxonomy.ts";
import { isRecipePublicationEvidenceApproved } from "./recipe-publication.ts";
import type {
  RecipeApiV1Card,
  RecipeApiV1Detail,
  RecipeApiV1ListData,
  RecipeApiV1RecommendationData,
  RecipeFeedbackV1Response,
} from "./recipe-api-v1-client.ts";
import type { RecipePublicationEvidence } from "../types/index.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INGREDIENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function exactObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record);
  if (
    actualKeys.length !== keys.length ||
    actualKeys.some((key) => !keys.includes(key)) ||
    keys.some((key) => !(key in record))
  ) {
    return null;
  }
  return record;
}

function boundedText(value: unknown, minimum = 1, maximum = 2_000): value is string {
  return (
    typeof value === "string" &&
    value.length <= maximum &&
    value.trim().length >= minimum &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}

function nullableText(value: unknown, maximum = 2_000): value is string | null {
  return value === null || boundedText(value, 1, maximum);
}

function boundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function boundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function uniqueTextArray(
  value: unknown,
  minimum: number,
  maximum: number,
  itemMaximum = 200,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every((item) => boundedText(item, 1, itemMaximum)) &&
    new Set(value).size === value.length
  );
}

function ingredientIdArray(value: unknown, maximum = 200): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maximum &&
    value.every((item) => typeof item === "string" && INGREDIENT_ID_PATTERN.test(item)) &&
    new Set(value).size === value.length
  );
}

function canonicalUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (!boundedText(value, 1, 2_048)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function dateTime(value: unknown): value is string {
  return boundedText(value, 1, 64) && Number.isFinite(Date.parse(value));
}

const PUBLICATION_EVIDENCE_KEYS = [
  "reviewStatus",
  "reviewedForBeginner",
  "beginnerReviewedAt",
  "actualCookingTested",
  "actualCookingTestedAt",
  "foodSafetyReviewed",
  "foodSafetyReviewedAt",
  "imageRightsStatus",
  "imageRightsReviewedAt",
  "sourceRecorded",
  "sourceReviewedAt",
  "publishedAt",
  "reviewer",
  "requirementsVerified",
] as const;

function publicationEvidence(value: unknown): value is RecipePublicationEvidence {
  const evidence = exactObject(value, PUBLICATION_EVIDENCE_KEYS);
  return Boolean(
    evidence &&
      isRecipePublicationEvidenceApproved(evidence as unknown as RecipePublicationEvidence),
  );
}

const CATEGORY_KEYS = ["id", "label"] as const;

function category(value: unknown): boolean {
  const record = exactObject(value, CATEGORY_KEYS);
  return Boolean(
    record &&
      isCanonicalRecipeCategoryId(record.id) &&
      record.label === canonicalRecipeCategoryLabel(record.id),
  );
}

const CARD_KEYS = [
  "id",
  "slug",
  "title",
  "summary",
  "category",
  "difficulty",
  "servings",
  "totalTimeMinutes",
  "thumbnailUrl",
  "tools",
  "requiredIngredientCount",
  "ownedIngredientCount",
  "matchedIngredientIds",
  "missingIngredientIds",
  "recommendationReason",
  "publishedAt",
  "publicationEvidence",
] as const;

function recipeCard(value: unknown): value is RecipeApiV1Card {
  const card = exactObject(value, CARD_KEYS);
  if (!card) return false;
  if (
    typeof card.id !== "string" ||
    !UUID_PATTERN.test(card.id) ||
    !nullableText(card.slug, 160) ||
    !boundedText(card.title, 1, 200) ||
    !boundedText(card.summary, 1, 2_000) ||
    !category(card.category) ||
    !boundedInteger(card.difficulty, 1, 3) ||
    !boundedInteger(card.servings, 1, 20) ||
    !boundedInteger(card.totalTimeMinutes, 1, 1_440) ||
    !canonicalUrl(card.thumbnailUrl) ||
    !uniqueTextArray(card.tools, 1, 20, 100) ||
    !boundedInteger(card.requiredIngredientCount, 0, 200) ||
    !boundedInteger(card.ownedIngredientCount, 0, 200) ||
    !ingredientIdArray(card.matchedIngredientIds) ||
    !ingredientIdArray(card.missingIngredientIds) ||
    !boundedText(card.recommendationReason, 1, 500) ||
    !dateTime(card.publishedAt) ||
    !publicationEvidence(card.publicationEvidence)
  ) {
    return false;
  }

  const matched = card.matchedIngredientIds as string[];
  const missing = card.missingIngredientIds as string[];
  const missingSet = new Set(missing);
  return (
    card.requiredIngredientCount === matched.length + missing.length &&
    card.ownedIngredientCount === matched.length &&
    matched.every((id) => !missingSet.has(id)) &&
    card.publishedAt ===
      (card.publicationEvidence as RecipePublicationEvidence).publishedAt
  );
}

const LIST_KEYS = ["recipes", "nextCursor"] as const;

export function isRecipeApiV1ListData(value: unknown): value is RecipeApiV1ListData {
  const data = exactObject(value, LIST_KEYS);
  return Boolean(
    data &&
      Array.isArray(data.recipes) &&
      data.recipes.length <= 50 &&
      data.recipes.every(recipeCard) &&
      new Set(data.recipes.map((recipe) => recipe.id)).size === data.recipes.length &&
      (data.nextCursor === null || boundedText(data.nextCursor, 1, 4_096)),
  );
}

const RECOMMENDATION_KEYS = ["recipe", "score", "reasons", "requestedServings"] as const;
const RECOMMENDATION_DATA_KEYS = ["recommendations", "candidateCount"] as const;

export function isRecipeApiV1RecommendationData(
  value: unknown,
): value is RecipeApiV1RecommendationData {
  const data = exactObject(value, RECOMMENDATION_DATA_KEYS);
  if (
    !data ||
    !Array.isArray(data.recommendations) ||
    data.recommendations.length > 20 ||
    !boundedInteger(data.candidateCount, 0, 1_000_000) ||
    data.candidateCount < data.recommendations.length
  ) {
    return false;
  }

  const valid = data.recommendations.every((value) => {
    const recommendation = exactObject(value, RECOMMENDATION_KEYS);
    return Boolean(
      recommendation &&
        recipeCard(recommendation.recipe) &&
        boundedNumber(recommendation.score, -10_000, 10_000) &&
        uniqueTextArray(recommendation.reasons, 1, 10, 500) &&
        boundedInteger(recommendation.requestedServings, 1, 20),
    );
  });
  return (
    valid &&
    new Set(
      data.recommendations.map(
        (item) => (item as { recipe: RecipeApiV1Card }).recipe.id,
      ),
    ).size === data.recommendations.length
  );
}

const QUANTITY_KEYS = ["value", "text", "unit"] as const;
const SUBSTITUTION_KEYS = ["ingredientId", "text", "ratio", "caution"] as const;
const INGREDIENT_KEYS = [
  "id",
  "ingredientId",
  "groupType",
  "displayName",
  "quantity",
  "preparation",
  "optional",
  "pantryStaple",
  "substitutions",
] as const;

function substitution(value: unknown): boolean {
  const item = exactObject(value, SUBSTITUTION_KEYS);
  if (!item) return false;
  const ingredientId =
    item.ingredientId === null ||
    (typeof item.ingredientId === "string" && INGREDIENT_ID_PATTERN.test(item.ingredientId));
  return Boolean(
    ingredientId &&
      nullableText(item.text, 200) &&
      nullableText(item.ratio, 100) &&
      nullableText(item.caution, 500) &&
      (item.ingredientId !== null || item.text !== null),
  );
}

function detailIngredient(value: unknown): boolean {
  const ingredient = exactObject(value, INGREDIENT_KEYS);
  if (!ingredient) return false;
  const quantity = exactObject(ingredient.quantity, QUANTITY_KEYS);
  return Boolean(
    boundedText(ingredient.id, 1, 200) &&
      typeof ingredient.ingredientId === "string" &&
      INGREDIENT_ID_PATTERN.test(ingredient.ingredientId) &&
      boundedText(ingredient.groupType, 1, 80) &&
      boundedText(ingredient.displayName, 1, 200) &&
      quantity &&
      (quantity.value === null || boundedNumber(quantity.value, 0, 1_000_000)) &&
      nullableText(quantity.text, 100) &&
      nullableText(quantity.unit, 40) &&
      (quantity.value !== null || quantity.text !== null) &&
      nullableText(ingredient.preparation, 500) &&
      typeof ingredient.optional === "boolean" &&
      typeof ingredient.pantryStaple === "boolean" &&
      Array.isArray(ingredient.substitutions) &&
      ingredient.substitutions.length <= 20 &&
      ingredient.substitutions.every(substitution)
  );
}

const SERVING_OPTION_KEYS = [
  "servings",
  "toolGuidance",
  "timeGuidance",
  "ingredientQuantities",
] as const;
const SERVING_QUANTITY_KEYS = ["recipeIngredientId", "quantity"] as const;

function servingOptions(
  value: unknown,
  baseServings: number,
  ingredients: Array<{ id: string; quantity: unknown }>,
): boolean {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20) return false;
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const seenServings = new Set<number>();
  let previousServings = 0;
  let baseOptionFound = false;

  for (const rawOption of value) {
    const option = exactObject(rawOption, SERVING_OPTION_KEYS);
    if (
      !option ||
      !boundedInteger(option.servings, 1, 20) ||
      seenServings.has(option.servings) ||
      option.servings <= previousServings ||
      !boundedText(option.toolGuidance, 1, 500) ||
      !boundedText(option.timeGuidance, 1, 500) ||
      !Array.isArray(option.ingredientQuantities) ||
      option.ingredientQuantities.length !== ingredients.length
    ) {
      return false;
    }
    seenServings.add(option.servings);
    previousServings = option.servings;

    const seenIngredientIds = new Set<string>();
    for (const rawQuantity of option.ingredientQuantities) {
      const servingQuantity = exactObject(rawQuantity, SERVING_QUANTITY_KEYS);
      const quantity = exactObject(servingQuantity?.quantity, QUANTITY_KEYS);
      if (
        !servingQuantity ||
        !boundedText(servingQuantity.recipeIngredientId, 1, 200) ||
        !ingredientById.has(servingQuantity.recipeIngredientId) ||
        seenIngredientIds.has(servingQuantity.recipeIngredientId) ||
        !quantity ||
        !(quantity.value === null || boundedNumber(quantity.value, 0, 1_000_000)) ||
        !boundedText(quantity.text, 1, 100) ||
        !nullableText(quantity.unit, 40)
      ) {
        return false;
      }
      seenIngredientIds.add(servingQuantity.recipeIngredientId);

      if (option.servings === baseServings) {
        const baseIngredient = ingredientById.get(servingQuantity.recipeIngredientId);
        const baseQuantity = exactObject(baseIngredient?.quantity, QUANTITY_KEYS);
        if (
          !baseQuantity ||
          quantity.value !== baseQuantity.value ||
          quantity.text !== baseQuantity.text ||
          quantity.unit !== baseQuantity.unit
        ) {
          return false;
        }
      }
    }
    if (option.servings === baseServings) baseOptionFound = true;
  }

  return baseOptionFound;
}

const DURATION_KEYS = ["min", "max", "timerPreset"] as const;
const CUE_KEYS = ["visual", "sound", "smell"] as const;
const USAGE_KEYS = ["recipeIngredientId", "usageText"] as const;
const STEP_KEYS = [
  "id",
  "order",
  "title",
  "instruction",
  "heatLevel",
  "durationSeconds",
  "cues",
  "safetyNote",
  "recoveryTip",
  "imageUrl",
  "ingredientUsages",
] as const;

function detailStep(value: unknown, ingredientIds: ReadonlySet<string>): boolean {
  const step = exactObject(value, STEP_KEYS);
  if (!step) return false;
  const duration = exactObject(step.durationSeconds, DURATION_KEYS);
  const cues = exactObject(step.cues, CUE_KEYS);
  if (
    !boundedText(step.id, 1, 200) ||
    !boundedInteger(step.order, 1, 200) ||
    !nullableText(step.title, 200) ||
    !boundedText(step.instruction, 1, 4_000) ||
    !boundedText(step.heatLevel, 1, 40) ||
    !duration ||
    !boundedInteger(duration.min, 0, 43_200) ||
    !(
      duration.max === null ||
      (boundedInteger(duration.max, duration.min, 43_200) && duration.max >= duration.min)
    ) ||
    !(
      duration.timerPreset === null ||
      (boundedInteger(duration.timerPreset, duration.min, duration.max ?? duration.min) &&
        duration.timerPreset >= duration.min)
    ) ||
    !cues ||
    !boundedText(cues.visual, 1, 1_000) ||
    !nullableText(cues.sound, 500) ||
    !nullableText(cues.smell, 500) ||
    !nullableText(step.safetyNote, 1_000) ||
    !boundedText(step.recoveryTip, 1, 2_000) ||
    !canonicalUrl(step.imageUrl) ||
    !Array.isArray(step.ingredientUsages) ||
    step.ingredientUsages.length > 100
  ) {
    return false;
  }

  return step.ingredientUsages.every((value) => {
    const usage = exactObject(value, USAGE_KEYS);
    return Boolean(
      usage &&
        boundedText(usage.recipeIngredientId, 1, 200) &&
        ingredientIds.has(usage.recipeIngredientId) &&
        nullableText(usage.usageText, 500),
    );
  });
}

const SOURCE_KEYS = [
  "provider",
  "external_id",
  "title",
  "source_url",
  "license",
  "attribution",
] as const;

function source(value: unknown): boolean {
  const record = exactObject(value, SOURCE_KEYS);
  return Boolean(
    record &&
      boundedText(record.provider, 1, 200) &&
      nullableText(record.external_id, 200) &&
      boundedText(record.title, 1, 500) &&
      canonicalUrl(record.source_url) &&
      boundedText(record.license, 1, 500) &&
      boundedText(record.attribution, 1, 500),
  );
}

const DETAIL_KEYS = [
  "id",
  "slug",
  "version",
  "schemaVersion",
  "title",
  "summary",
  "category",
  "cuisineType",
  "difficulty",
  "servings",
  "prepTimeMinutes",
  "cookTimeMinutes",
  "totalTimeMinutes",
  "thumbnailUrl",
  "tools",
  "servingOptions",
  "ingredients",
  "steps",
  "safetyNotes",
  "storageGuide",
  "reheatingGuide",
  "source",
  "publishedAt",
  "publicationEvidence",
] as const;

export function isRecipeApiV1Detail(value: unknown): value is RecipeApiV1Detail {
  const detail = exactObject(value, DETAIL_KEYS);
  if (
    !detail ||
    typeof detail.id !== "string" ||
    !UUID_PATTERN.test(detail.id) ||
    !nullableText(detail.slug, 160) ||
    !boundedInteger(detail.version, 1, 1_000_000) ||
    detail.schemaVersion !== 2 ||
    !boundedText(detail.title, 1, 200) ||
    !boundedText(detail.summary, 1, 2_000) ||
    !category(detail.category) ||
    !nullableText(detail.cuisineType, 100) ||
    !boundedInteger(detail.difficulty, 1, 3) ||
    !boundedInteger(detail.servings, 1, 20) ||
    !boundedInteger(detail.prepTimeMinutes, 0, 1_440) ||
    !boundedInteger(detail.cookTimeMinutes, 1, 1_440) ||
    !boundedInteger(detail.totalTimeMinutes, 1, 1_440) ||
    detail.totalTimeMinutes < detail.prepTimeMinutes + detail.cookTimeMinutes ||
    !canonicalUrl(detail.thumbnailUrl) ||
    !uniqueTextArray(detail.tools, 1, 20, 100) ||
    !Array.isArray(detail.ingredients) ||
    detail.ingredients.length < 3 ||
    detail.ingredients.length > 200 ||
    !detail.ingredients.every(detailIngredient)
  ) {
    return false;
  }

  const ingredientIds = new Set(
    detail.ingredients.map((ingredient) => (ingredient as { id: string }).id),
  );
  if (
    ingredientIds.size !== detail.ingredients.length ||
    !servingOptions(
      detail.servingOptions,
      detail.servings as number,
      detail.ingredients as Array<{ id: string; quantity: unknown }>,
    ) ||
    !Array.isArray(detail.steps) ||
    detail.steps.length < 3 ||
    detail.steps.length > 200 ||
    !detail.steps.every((step) => detailStep(step, ingredientIds))
  ) {
    return false;
  }
  const stepOrders = detail.steps.map((step) => (step as { order: number }).order);
  const stepIds = detail.steps.map((step) => (step as { id: string }).id);

  return (
    new Set(stepIds).size === stepIds.length &&
    stepOrders.every((order, index) => order === index + 1) &&
    uniqueTextArray(detail.safetyNotes, 1, 50, 1_000) &&
    boundedText(detail.storageGuide, 1, 2_000) &&
    boundedText(detail.reheatingGuide, 1, 2_000) &&
    source(detail.source) &&
    dateTime(detail.publishedAt) &&
    publicationEvidence(detail.publicationEvidence) &&
    detail.publishedAt ===
      (detail.publicationEvidence as RecipePublicationEvidence).publishedAt
  );
}

const FEEDBACK_RESPONSE_KEYS = ["accepted", "duplicate", "clientSubmissionId"] as const;

export function isRecipeFeedbackV1Response(
  value: unknown,
): value is RecipeFeedbackV1Response {
  const response = exactObject(value, FEEDBACK_RESPONSE_KEYS);
  return Boolean(
    response &&
      response.accepted === true &&
      typeof response.duplicate === "boolean" &&
      typeof response.clientSubmissionId === "string" &&
      UUID_PATTERN.test(response.clientSubmissionId),
  );
}
