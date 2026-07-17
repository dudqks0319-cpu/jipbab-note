import {
  decodeRecipeCursor,
  encodeRecipeCursor,
  type RecipeCursor,
  type RankedRecipeSort,
  type RecipeSort,
} from "./api-v1-contract.ts";
import {
  canonicalRecipeCategoryLabel,
  isCanonicalRecipeCategoryId,
  type CanonicalRecipeCategoryId,
} from "./recipe-category-taxonomy.ts";
import {
  isDatabaseRecipePublicationApproved,
  toRecipePublicationEvidence,
} from "./recipe-publication.ts";
import { normalizeHttpUrl } from "./request-security.ts";
import { getServerSupabaseAdminClient } from "./supabase-server.ts";
import type { RecipePublicationEvidence } from "../types/index.ts";

export interface PublicRecipeListQuery {
  query: string | null;
  categoryId: CanonicalRecipeCategoryId | null;
  difficulty: number | null;
  maxTotalTime: number | null;
  maxMissingIngredients: number | null;
  ingredientIds: string[];
  excludeIngredientIds: string[];
  excludedAllergenIds: string[];
  sort: RecipeSort;
  cursor: RecipeCursor | null;
  limit: number;
}

export interface RecipeV1Card {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  category: { id: CanonicalRecipeCategoryId; label: string };
  difficulty: number;
  servings: number;
  totalTimeMinutes: number;
  thumbnailUrl: string | null;
  tools: string[];
  requiredIngredientCount: number;
  ownedIngredientCount: number;
  matchedIngredientIds: string[];
  missingIngredientIds: string[];
  recommendationReason: string;
  publishedAt: string;
  publicationEvidence: RecipePublicationEvidence;
  isTestFixture?: boolean;
}

export interface PublicRecipeListResult {
  recipes: RecipeV1Card[];
  nextCursor: string | null;
}

export type PublicRecipeRow = {
  id: string;
  slug: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  category: string | null;
  category_id: string | null;
  difficulty: number | null;
  servings_base: number | null;
  total_time_minutes: number | null;
  thumbnail_url: string | null;
  ingredients: unknown;
  steps: unknown;
  tools: unknown;
  source_id: string | null;
  review_status: string;
  reviewed_for_beginner: boolean;
  beginner_reviewed_at: string | null;
  actual_cooking_tested: boolean;
  actual_cooking_tested_at: string | null;
  food_safety_reviewed: boolean;
  food_safety_reviewed_at: string | null;
  image_rights_status: string;
  image_rights_reviewed_at: string | null;
  source_reviewed_at: string | null;
  reviewer: string | null;
  published_at: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  storage_guide: string | null;
  reheating_guide: string | null;
  safety_notes?: unknown;
  cuisine_type?: string | null;
  schema_version: number;
  version?: number;
};

export type RecipeIngredientRow = {
  recipe_id: string;
  ingredient_id: string | null;
  optional: boolean;
  pantry_staple: boolean;
};

export class RecipeApiDependencyError extends Error {
  constructor() {
    super("recipe_api_dependency_not_ready");
    this.name = "RecipeApiDependencyError";
  }
}

export type RecipeIngredientAllergenProfileRow = {
  ingredient_id: string;
  review_status: string;
};

export type RecipeIngredientAllergenLinkRow = {
  ingredient_id: string;
  allergen_group_id: string;
  presence_type: string;
};

export function recipePassesAllergenHardFilter(
  ingredientIds: string[],
  excludedAllergenIds: string[],
  profiles: RecipeIngredientAllergenProfileRow[],
  links: RecipeIngredientAllergenLinkRow[],
): boolean {
  if (excludedAllergenIds.length === 0) return true;

  const profileByIngredient = new Map(
    profiles.map((profile) => [profile.ingredient_id, profile.review_status]),
  );
  if (ingredientIds.some((ingredientId) => profileByIngredient.get(ingredientId) !== "approved")) {
    return false;
  }

  const recipeIngredientIds = new Set(ingredientIds);
  const excluded = new Set(excludedAllergenIds);
  return !links.some(
    (link) => recipeIngredientIds.has(link.ingredient_id) && excluded.has(link.allergen_group_id),
  );
}

function recommendationReason(owned: number, missing: number, total: number): string {
  if (total > 0 && missing === 0) {
    return "필수 재료가 모두 있어 바로 만들 수 있어요.";
  }
  if (owned > 0 && missing === 1) {
    return "재료 1개만 더 있으면 만들 수 있어요.";
  }
  if (owned > 0) {
    return `필수 재료 ${total}개 중 ${owned}개가 있어요.`;
  }
  return "필수 재료를 확인해 장보기 목록에 담아 보세요.";
}

function rowCursor(row: PublicRecipeRow): string | null {
  if (!row.published_at) {
    return null;
  }
  return encodeRecipeCursor({ kind: "recent", publishedAt: row.published_at, id: row.id });
}

function recentCardOrder(left: RecipeV1Card, right: RecipeV1Card): number {
  return right.publishedAt.localeCompare(left.publishedAt) || right.id.localeCompare(left.id);
}

function recommendationCardScore(recipe: RecipeV1Card): number {
  const ratio =
    recipe.requiredIngredientCount > 0
      ? recipe.ownedIngredientCount / recipe.requiredIngredientCount
      : 0;
  return (
    ratio * 100 -
    recipe.missingIngredientIds.length * 18 +
    Math.max(0, 4 - recipe.difficulty) * 3 +
    Math.max(0, 30 - recipe.totalTimeMinutes) * 0.2
  );
}

export function sortPublicRecipeCards(
  recipes: RecipeV1Card[],
  sort: RecipeSort,
): RecipeV1Card[] {
  return recipes.slice().sort((left, right) => {
    if (sort === "recommended") {
      return recommendationCardScore(right) - recommendationCardScore(left) || recentCardOrder(left, right);
    }
    if (sort === "most-owned") {
      return (
        right.ownedIngredientCount - left.ownedIngredientCount ||
        left.missingIngredientIds.length - right.missingIngredientIds.length ||
        recentCardOrder(left, right)
      );
    }
    if (sort === "least-missing") {
      return (
        left.missingIngredientIds.length - right.missingIngredientIds.length ||
        right.ownedIngredientCount - left.ownedIngredientCount ||
        recentCardOrder(left, right)
      );
    }
    if (sort === "fastest") {
      return left.totalTimeMinutes - right.totalTimeMinutes || recentCardOrder(left, right);
    }
    return recentCardOrder(left, right);
  });
}

function isPublicV2Row(row: PublicRecipeRow): boolean {
  return (
    row.schema_version === 2 &&
    isCanonicalRecipeCategoryId(row.category_id) &&
    isDatabaseRecipePublicationApproved(row) &&
    Boolean(toRecipePublicationEvidence(row))
  );
}

export function buildPublicRecipeListResult(
  rawRows: PublicRecipeRow[],
  ingredientData: RecipeIngredientRow[],
  input: PublicRecipeListQuery,
  scanLimit: number,
  scannedRows: PublicRecipeRow[] = rawRows,
  allergenProfiles: RecipeIngredientAllergenProfileRow[] = [],
  allergenLinks: RecipeIngredientAllergenLinkRow[] = [],
): PublicRecipeListResult {
  const scanCursor =
    scannedRows.length >= scanLimit && scannedRows.length > 0
      ? rowCursor(scannedRows.at(-1) as PublicRecipeRow)
      : null;
  const rows = rawRows.filter(isPublicV2Row);
  if (rows.length === 0) {
    return { recipes: [], nextCursor: scanCursor };
  }

  const ingredientsByRecipe = new Map<string, RecipeIngredientRow[]>();
  for (const ingredient of ingredientData) {
    const current = ingredientsByRecipe.get(ingredient.recipe_id) ?? [];
    current.push(ingredient);
    ingredientsByRecipe.set(ingredient.recipe_id, current);
  }

  const owned = new Set(input.ingredientIds);
  const excluded = new Set(input.excludeIngredientIds);
  const recipes: RecipeV1Card[] = [];
  let nextCursor: string | null = null;

  for (const row of rows) {
    const categoryId = row.category_id;
    const evidence = toRecipePublicationEvidence(row);
    if (!isCanonicalRecipeCategoryId(categoryId) || !evidence) {
      continue;
    }

    const ingredientRows = ingredientsByRecipe.get(row.id) ?? [];
    const allIngredientIds = ingredientRows
      .map((ingredient) => ingredient.ingredient_id)
      .filter((value): value is string => Boolean(value));
    if (allIngredientIds.length === 0 || allIngredientIds.some((id) => excluded.has(id))) {
      continue;
    }
    if (
      !recipePassesAllergenHardFilter(
        allIngredientIds,
        input.excludedAllergenIds,
        allergenProfiles,
        allergenLinks,
      )
    ) {
      continue;
    }

    const requiredIngredientIds = [
      ...new Set(
        ingredientRows
          .filter((ingredient) => !ingredient.optional && !ingredient.pantry_staple)
          .map((ingredient) => ingredient.ingredient_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const missingIngredientIds = requiredIngredientIds.filter((id) => !owned.has(id));
    const matchedIngredientIds = requiredIngredientIds.filter((id) => owned.has(id));
    if (
      input.maxMissingIngredients !== null &&
      missingIngredientIds.length > input.maxMissingIngredients
    ) {
      continue;
    }

    const ownedIngredientCount = requiredIngredientIds.length - missingIngredientIds.length;
    recipes.push({
      id: row.id,
      slug: row.slug,
      title: row.title.trim(),
      summary: (row.summary ?? row.description ?? "").trim(),
      category: { id: categoryId, label: canonicalRecipeCategoryLabel(categoryId) },
      difficulty: row.difficulty as number,
      servings: row.servings_base as number,
      totalTimeMinutes: row.total_time_minutes as number,
      thumbnailUrl: normalizeHttpUrl(row.thumbnail_url),
      tools: toolNames(row.tools),
      requiredIngredientCount: requiredIngredientIds.length,
      ownedIngredientCount,
      matchedIngredientIds,
      missingIngredientIds,
      recommendationReason: recommendationReason(
        ownedIngredientCount,
        missingIngredientIds.length,
        requiredIngredientIds.length,
      ),
      publishedAt: row.published_at as string,
      publicationEvidence: evidence,
    });
    nextCursor = rowCursor(row);
    if (recipes.length >= input.limit) {
      break;
    }
  }

  if (recipes.length < input.limit) {
    nextCursor = scanCursor;
  }

  return { recipes, nextCursor };
}

export async function listPublicRecipesV1(
  input: PublicRecipeListQuery,
): Promise<PublicRecipeListResult> {
  let client;
  try {
    client = getServerSupabaseAdminClient();
  } catch {
    throw new RecipeApiDependencyError();
  }
  const rankedSort: RankedRecipeSort | null =
    input.sort === "recent" ? null : input.sort;
  const scanLimit = rankedSort ? 201 : Math.min(input.limit * 4 + 1, 201);
  let request = client
    .from("recipes")
    .select(
      "id,slug,version,title,summary,description,category,category_id,cuisine_type,difficulty,servings_base,total_time_minutes,thumbnail_url,ingredients,steps,tools,safety_notes,source_id,review_status,reviewed_for_beginner,beginner_reviewed_at,actual_cooking_tested,actual_cooking_tested_at,food_safety_reviewed,food_safety_reviewed_at,image_rights_status,image_rights_reviewed_at,source_reviewed_at,reviewer,published_at,prep_time_minutes,cook_time_minutes,storage_guide,reheating_guide,schema_version",
    )
    .eq("schema_version", 2)
    .eq("review_status", "approved")
    .eq("reviewed_for_beginner", true)
    .eq("actual_cooking_tested", true)
    .eq("food_safety_reviewed", true)
    .in("image_rights_status", ["approved", "no_image_approved"])
    .not("source_id", "is", null)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(scanLimit);

  if (input.query) {
    request = request.ilike("title", `%${input.query}%`);
  }
  if (input.categoryId) {
    request = request.eq("category_id", input.categoryId);
  }
  if (input.difficulty) {
    request = request.eq("difficulty", input.difficulty);
  }
  if (input.maxTotalTime) {
    request = request.lte("total_time_minutes", input.maxTotalTime);
  }
  if (input.cursor?.kind === "recent") {
    request = request.or(
      `published_at.lt.${input.cursor.publishedAt},and(published_at.eq.${input.cursor.publishedAt},id.lt.${input.cursor.id})`,
    );
  }

  const { data, error } = await request;
  if (error || !Array.isArray(data)) {
    throw new RecipeApiDependencyError();
  }

  const rows = data as PublicRecipeRow[];
  if (rows.length === 0) {
    return { recipes: [], nextCursor: null };
  }

  const recipeIds = rows.map((row) => row.id);
  const sourceIds = [
    ...new Set(rows.map((row) => row.source_id).filter((value): value is string => Boolean(value))),
  ];
  const [ingredientResult, stepResult, usageResult, sourceResult] = await Promise.all([
    client
      .from("recipe_ingredients")
      .select(
        "id,recipe_id,ingredient_id,group_type,display_name,quantity_value,quantity_text,unit,preparation,optional,pantry_staple,scale_mode,sort_order",
      )
      .in("recipe_id", recipeIds),
    client
      .from("recipe_steps")
      .select(
        "id,recipe_id,step_order,title,instruction,heat_level,duration_seconds_min,duration_seconds_max,timer_preset_seconds,visual_cue,sound_cue,smell_cue,safety_note,recovery_tip,image_url",
      )
      .in("recipe_id", recipeIds),
    client
      .from("recipe_step_ingredients")
      .select("recipe_id,recipe_step_id,recipe_ingredient_id,usage_text")
      .in("recipe_id", recipeIds),
    client
      .from("recipe_sources")
      .select("id,provider,external_id,title,source_url,license,attribution")
      .in("id", sourceIds),
  ]);
  if (
    ingredientResult.error ||
    stepResult.error ||
    usageResult.error ||
    sourceResult.error ||
    !Array.isArray(ingredientResult.data) ||
    !Array.isArray(stepResult.data) ||
    !Array.isArray(usageResult.data) ||
    !Array.isArray(sourceResult.data)
  ) {
    throw new RecipeApiDependencyError();
  }

  const ingredientData = ingredientResult.data as RecipeV1ListIngredientRow[];
  let allergenProfiles: RecipeIngredientAllergenProfileRow[] = [];
  let allergenLinks: RecipeIngredientAllergenLinkRow[] = [];
  if (input.excludedAllergenIds.length > 0) {
    const catalogIngredientIds = [
      ...new Set(
        ingredientData
          .map((ingredient) => ingredient.ingredient_id)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    if (catalogIngredientIds.length === 0) {
      throw new RecipeApiDependencyError();
    }
    const [profileResult, linkResult] = await Promise.all([
      client
        .from("ingredient_allergen_profiles")
        .select("ingredient_id,review_status")
        .in("ingredient_id", catalogIngredientIds),
      client
        .from("ingredient_allergen_links")
        .select("ingredient_id,allergen_group_id,presence_type")
        .in("ingredient_id", catalogIngredientIds),
    ]);
    if (
      profileResult.error ||
      linkResult.error ||
      !Array.isArray(profileResult.data) ||
      !Array.isArray(linkResult.data)
    ) {
      throw new RecipeApiDependencyError();
    }
    allergenProfiles = profileResult.data as RecipeIngredientAllergenProfileRow[];
    allergenLinks = linkResult.data as RecipeIngredientAllergenLinkRow[];
  }
  const normalizedRows = filterNormalizedPublicRecipeRows(
    rows,
    ingredientData,
    stepResult.data as RecipeV1ListStepRow[],
    usageResult.data as RecipeV1ListStepUsageRow[],
    sourceResult.data as RecipeV1ListSourceRow[],
  );

  const listResult = buildPublicRecipeListResult(
    normalizedRows,
    ingredientData,
    rankedSort ? { ...input, cursor: null, limit: 201 } : input,
    scanLimit,
    rows,
    allergenProfiles,
    allergenLinks,
  );
  if (!rankedSort) {
    return listResult;
  }

  const offset = input.cursor?.kind === "ranked" ? input.cursor.offset : 0;
  const sorted = sortPublicRecipeCards(listResult.recipes, rankedSort);
  const recipes = sorted.slice(offset, offset + input.limit);
  const nextOffset = offset + recipes.length;
  return {
    recipes,
    nextCursor:
      nextOffset < sorted.length
        ? encodeRecipeCursor({ kind: "ranked", sort: rankedSort, offset: nextOffset })
        : null,
  };
}

export function parseRepositoryCursor(value: string | null, sort: RecipeSort): RecipeCursor | null {
  return decodeRecipeCursor(value, sort);
}

export type RecipeV1IngredientRow = {
  id: string;
  ingredient_id: string | null;
  group_type: string;
  display_name: string;
  quantity_value: number | string | null;
  quantity_text: string | null;
  unit: string | null;
  preparation: string | null;
  optional: boolean;
  pantry_staple: boolean;
  scale_mode?: "linear" | "fixed" | "to_taste";
  sort_order: number;
};

export type RecipeV1SubstitutionRow = {
  recipe_ingredient_id: string;
  substitute_ingredient_id: string | null;
  substitute_text: string | null;
  ratio_text: string | null;
  caution_text: string | null;
  sort_order: number;
};

export type RecipeV1StepRow = {
  id: string;
  step_order: number;
  title: string | null;
  instruction: string;
  heat_level: string | null;
  duration_seconds_min: number | null;
  duration_seconds_max: number | null;
  timer_preset_seconds: number | null;
  visual_cue: string | null;
  sound_cue: string | null;
  smell_cue: string | null;
  safety_note: string | null;
  recovery_tip: string | null;
  image_url: string | null;
};

export type RecipeV1StepUsageRow = {
  recipe_step_id: string;
  recipe_ingredient_id: string;
  usage_text: string | null;
};

export type RecipeV1SourceRow = {
  provider: string;
  external_id: string | null;
  title: string;
  source_url: string | null;
  license: string;
  attribution: string;
};

export type RecipeV1ListIngredientRow = RecipeV1IngredientRow & { recipe_id: string };
export type RecipeV1ListStepRow = RecipeV1StepRow & { recipe_id: string };
export type RecipeV1ListStepUsageRow = RecipeV1StepUsageRow & { recipe_id: string };
export type RecipeV1ListSourceRow = RecipeV1SourceRow & { id: string };

export type RecipeV1Detail = {
  id: string;
  slug: string | null;
  version: number;
  schemaVersion: 2;
  title: string;
  summary: string;
  category: { id: CanonicalRecipeCategoryId; label: string };
  cuisineType: string | null;
  difficulty: number;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  thumbnailUrl: string | null;
  tools: string[];
  ingredients: Array<{
    id: string;
    ingredientId: string;
    groupType: string;
    displayName: string;
    quantity: { value: number | null; text: string | null; unit: string | null };
    preparation: string | null;
    optional: boolean;
    pantryStaple: boolean;
    substitutions: Array<{
      ingredientId: string | null;
      text: string | null;
      ratio: string | null;
      caution: string | null;
    }>;
  }>;
  steps: Array<{
    id: string;
    order: number;
    title: string | null;
    instruction: string;
    heatLevel: string;
    durationSeconds: { min: number; max: number | null; timerPreset: number | null };
    cues: { visual: string; sound: string | null; smell: string | null };
    safetyNote: string | null;
    recoveryTip: string;
    imageUrl: string | null;
    ingredientUsages: Array<{ recipeIngredientId: string; usageText: string | null }>;
  }>;
  safetyNotes: string[];
  storageGuide: string;
  reheatingGuide: string;
  source: RecipeV1SourceRow;
  publishedAt: string;
  publicationEvidence: RecipePublicationEvidence;
  isTestFixture?: boolean;
};

function toolNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((tool) => {
      if (typeof tool === "string") return tool.trim();
      if (tool && typeof tool === "object" && !Array.isArray(tool)) {
        const name = (tool as Record<string, unknown>).name;
        return typeof name === "string" ? name.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
    : [];
}

function finiteNullableNumber(value: number | string | null): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildPublicRecipeDetail(
  row: PublicRecipeRow,
  ingredientRows: RecipeV1IngredientRow[],
  substitutionRows: RecipeV1SubstitutionRow[],
  stepRows: RecipeV1StepRow[],
  usageRows: RecipeV1StepUsageRow[],
  source: RecipeV1SourceRow | null,
): RecipeV1Detail | null {
  const categoryId = row.category_id;
  const evidence = toRecipePublicationEvidence(row);
  const tools = toolNames(row.tools);
  const safetyNotes = stringArray(row.safety_notes);
  if (
    !isPublicV2Row(row) ||
    !isCanonicalRecipeCategoryId(categoryId) ||
    !evidence ||
    !source ||
    !source.provider.trim() ||
    !source.title.trim() ||
    !source.license.trim() ||
    !source.attribution.trim() ||
    tools.length === 0 ||
    safetyNotes.length === 0 ||
    ingredientRows.length < 3 ||
    stepRows.length < 3
  ) {
    return null;
  }

  const substitutionsByIngredient = new Map<string, RecipeV1SubstitutionRow[]>();
  for (const substitution of substitutionRows) {
    const current = substitutionsByIngredient.get(substitution.recipe_ingredient_id) ?? [];
    current.push(substitution);
    substitutionsByIngredient.set(substitution.recipe_ingredient_id, current);
  }
  const usagesByStep = new Map<string, RecipeV1StepUsageRow[]>();
  for (const usage of usageRows) {
    const current = usagesByStep.get(usage.recipe_step_id) ?? [];
    current.push(usage);
    usagesByStep.set(usage.recipe_step_id, current);
  }

  if (
    ingredientRows.some((ingredient) => {
      const quantityValue = finiteNullableNumber(ingredient.quantity_value);
      return (
        !ingredient.ingredient_id ||
        !ingredient.display_name.trim() ||
        quantityValue === undefined ||
        (!ingredient.quantity_text && quantityValue === null)
      );
    })
  ) {
    return null;
  }

  const ingredients = ingredientRows
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((ingredient) => ({
      id: ingredient.id,
      ingredientId: ingredient.ingredient_id ?? "",
      groupType: ingredient.group_type,
      displayName: ingredient.display_name.trim(),
      quantity: {
        value: finiteNullableNumber(ingredient.quantity_value) as number | null,
        text: ingredient.quantity_text,
        unit: ingredient.unit,
      },
      preparation: ingredient.preparation,
      optional: ingredient.optional,
      pantryStaple: ingredient.pantry_staple,
      scaleMode: ingredient.scale_mode ?? "linear",
      substitutions: (substitutionsByIngredient.get(ingredient.id) ?? [])
        .slice()
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((substitution) => ({
          ingredientId: substitution.substitute_ingredient_id,
          text: substitution.substitute_text,
          ratio: substitution.ratio_text,
          caution: substitution.caution_text,
        })),
    }));
  const usedIngredientIds = new Set(usageRows.map((usage) => usage.recipe_ingredient_id));
  if (ingredientRows.some((ingredient) => !usedIngredientIds.has(ingredient.id))) {
    return null;
  }

  const steps = stepRows
    .slice()
    .sort((left, right) => left.step_order - right.step_order)
    .map((step) => ({
      id: step.id,
      order: step.step_order,
      title: step.title,
      instruction: step.instruction.trim(),
      heatLevel: step.heat_level ?? "",
      durationSeconds: {
        min: step.duration_seconds_min ?? -1,
        max: step.duration_seconds_max,
        timerPreset: step.timer_preset_seconds,
      },
      cues: {
        visual: step.visual_cue?.trim() ?? "",
        sound: step.sound_cue,
        smell: step.smell_cue,
      },
      safetyNote: step.safety_note,
      recoveryTip: step.recovery_tip?.trim() ?? "",
      imageUrl: normalizeHttpUrl(step.image_url),
      ingredientUsages: (usagesByStep.get(step.id) ?? []).map((usage) => ({
        recipeIngredientId: usage.recipe_ingredient_id,
        usageText: usage.usage_text,
      })),
    }));
  if (
    steps.some(
      (step) =>
        !step.instruction ||
        !step.heatLevel ||
        step.durationSeconds.min < 0 ||
        !step.cues.visual ||
        !step.recoveryTip,
    )
  ) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    version: row.version ?? 1,
    schemaVersion: 2,
    title: row.title.trim(),
    summary: (row.summary ?? row.description ?? "").trim(),
    category: { id: categoryId, label: canonicalRecipeCategoryLabel(categoryId) },
    cuisineType: row.cuisine_type ?? null,
    difficulty: row.difficulty as number,
    servings: row.servings_base as number,
    prepTimeMinutes: row.prep_time_minutes as number,
    cookTimeMinutes: row.cook_time_minutes as number,
    totalTimeMinutes: row.total_time_minutes as number,
    thumbnailUrl: normalizeHttpUrl(row.thumbnail_url),
    tools,
    ingredients,
    steps,
    safetyNotes,
    storageGuide: row.storage_guide?.trim() ?? "",
    reheatingGuide: row.reheating_guide?.trim() ?? "",
    source: {
      ...source,
      provider: source.provider.trim(),
      title: source.title.trim(),
      license: source.license.trim(),
      attribution: source.attribution.trim(),
      source_url: normalizeHttpUrl(source.source_url),
    },
    publishedAt: row.published_at as string,
    publicationEvidence: evidence,
  };
}

export function filterNormalizedPublicRecipeRows(
  rows: PublicRecipeRow[],
  ingredientRows: RecipeV1ListIngredientRow[],
  stepRows: RecipeV1ListStepRow[],
  usageRows: RecipeV1ListStepUsageRow[],
  sourceRows: RecipeV1ListSourceRow[],
): PublicRecipeRow[] {
  const ingredientsByRecipe = new Map<string, RecipeV1IngredientRow[]>();
  for (const ingredient of ingredientRows) {
    const current = ingredientsByRecipe.get(ingredient.recipe_id) ?? [];
    current.push(ingredient);
    ingredientsByRecipe.set(ingredient.recipe_id, current);
  }
  const stepsByRecipe = new Map<string, RecipeV1StepRow[]>();
  for (const step of stepRows) {
    const current = stepsByRecipe.get(step.recipe_id) ?? [];
    current.push(step);
    stepsByRecipe.set(step.recipe_id, current);
  }
  const usagesByRecipe = new Map<string, RecipeV1StepUsageRow[]>();
  for (const usage of usageRows) {
    const current = usagesByRecipe.get(usage.recipe_id) ?? [];
    current.push(usage);
    usagesByRecipe.set(usage.recipe_id, current);
  }
  const sourcesById = new Map(sourceRows.map((source) => [source.id, source]));

  return rows.filter((row) => {
    const sourceWithId = row.source_id ? sourcesById.get(row.source_id) : null;
    if (!sourceWithId) {
      return false;
    }
    const source: RecipeV1SourceRow = {
      provider: sourceWithId.provider,
      external_id: sourceWithId.external_id,
      title: sourceWithId.title,
      source_url: sourceWithId.source_url,
      license: sourceWithId.license,
      attribution: sourceWithId.attribution,
    };
    return Boolean(
      buildPublicRecipeDetail(
        row,
        ingredientsByRecipe.get(row.id) ?? [],
        [],
        stepsByRecipe.get(row.id) ?? [],
        usagesByRecipe.get(row.id) ?? [],
        source,
      ),
    );
  });
}

export async function getPublicRecipeDetailV1(recipeId: string): Promise<RecipeV1Detail | null> {
  let client;
  try {
    client = getServerSupabaseAdminClient();
  } catch {
    throw new RecipeApiDependencyError();
  }

  const { data, error } = await client
    .from("recipes")
    .select(
      "id,slug,version,title,summary,description,category,category_id,cuisine_type,difficulty,servings_base,prep_time_minutes,cook_time_minutes,total_time_minutes,thumbnail_url,tools,ingredients,steps,safety_notes,storage_guide,reheating_guide,source_id,review_status,reviewed_for_beginner,beginner_reviewed_at,actual_cooking_tested,actual_cooking_tested_at,food_safety_reviewed,food_safety_reviewed_at,image_rights_status,image_rights_reviewed_at,source_reviewed_at,reviewer,published_at,schema_version",
    )
    .eq("id", recipeId)
    .eq("schema_version", 2)
    .eq("review_status", "approved")
    .eq("reviewed_for_beginner", true)
    .eq("actual_cooking_tested", true)
    .eq("food_safety_reviewed", true)
    .in("image_rights_status", ["approved", "no_image_approved"])
    .not("source_id", "is", null)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) {
    throw new RecipeApiDependencyError();
  }
  if (!data || !isPublicV2Row(data as PublicRecipeRow)) {
    return null;
  }

  const row = data as PublicRecipeRow;
  const [ingredientResult, stepResult, usageResult, sourceResult] = await Promise.all([
    client
      .from("recipe_ingredients")
      .select(
        "id,ingredient_id,group_type,display_name,quantity_value,quantity_text,unit,preparation,optional,pantry_staple,scale_mode,sort_order",
      )
      .eq("recipe_id", recipeId)
      .order("sort_order", { ascending: true }),
    client
      .from("recipe_steps")
      .select(
        "id,step_order,title,instruction,heat_level,duration_seconds_min,duration_seconds_max,timer_preset_seconds,visual_cue,sound_cue,smell_cue,safety_note,recovery_tip,image_url",
      )
      .eq("recipe_id", recipeId)
      .order("step_order", { ascending: true }),
    client
      .from("recipe_step_ingredients")
      .select("recipe_step_id,recipe_ingredient_id,usage_text")
      .eq("recipe_id", recipeId),
    client
      .from("recipe_sources")
      .select("provider,external_id,title,source_url,license,attribution")
      .eq("id", row.source_id as string)
      .maybeSingle(),
  ]);
  if (
    ingredientResult.error ||
    stepResult.error ||
    usageResult.error ||
    sourceResult.error ||
    !Array.isArray(ingredientResult.data) ||
    !Array.isArray(stepResult.data) ||
    !Array.isArray(usageResult.data)
  ) {
    throw new RecipeApiDependencyError();
  }

  const ingredientRows = ingredientResult.data as RecipeV1IngredientRow[];
  const ingredientIds = ingredientRows.map((ingredient) => ingredient.id);
  const substitutionResult = ingredientIds.length
    ? await client
        .from("recipe_ingredient_substitutions")
        .select(
          "recipe_ingredient_id,substitute_ingredient_id,substitute_text,ratio_text,caution_text,sort_order",
        )
        .in("recipe_ingredient_id", ingredientIds)
    : { data: [], error: null };
  if (substitutionResult.error || !Array.isArray(substitutionResult.data)) {
    throw new RecipeApiDependencyError();
  }

  return buildPublicRecipeDetail(
    row,
    ingredientRows,
    substitutionResult.data as RecipeV1SubstitutionRow[],
    stepResult.data as RecipeV1StepRow[],
    usageResult.data as RecipeV1StepUsageRow[],
    (sourceResult.data as RecipeV1SourceRow | null) ?? null,
  );
}
