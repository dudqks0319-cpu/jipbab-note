import { getIngredientCatalog } from "./ingredient-catalog.ts";
import type { RecipeFeedbackV1Input } from "./recipe-feedback.ts";
import type { CanonicalRecipeCategoryId } from "./recipe-category-taxonomy.ts";
import {
  isRecipeApiV1Detail,
  isRecipeApiV1ListData,
  isRecipeApiV1RecommendationData,
  isRecipeFeedbackV1Response,
} from "./recipe-api-v1-response-schema.ts";
import type {
  RecipeDetailRecord,
  RecipePublicationEvidence,
  RecipeRecord,
  RecipeWithMatch,
} from "../types/index.ts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
const ingredientCatalog = getIngredientCatalog();
const ingredientById = new Map(ingredientCatalog.map((item) => [item.id, item]));
const ingredientIdByExactName = new Map<string, string>();

for (const item of ingredientCatalog) {
  ingredientIdByExactName.set(item.name.trim().toLowerCase(), item.id);
  for (const alias of item.aliases ?? []) {
    ingredientIdByExactName.set(alias.trim().toLowerCase(), item.id);
  }
}

export type RecipeApiV1Sort =
  | "recommended"
  | "most-owned"
  | "least-missing"
  | "fastest"
  | "recent";

export interface RecipeApiV1Card {
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
}

export type RecipeApiV1MatchedCard = RecipeWithMatch & {
  requiredIngredientCount: number;
  ownedIngredientCount: number;
  recommendationReason: string;
};

export interface RecipeApiV1ListData {
  recipes: RecipeApiV1Card[];
  nextCursor: string | null;
}

export interface RecipeApiV1Recommendation {
  recipe: RecipeApiV1Card;
  score: number;
  reasons: string[];
  requestedServings: number;
}

export interface RecipeApiV1RecommendationData {
  recommendations: RecipeApiV1Recommendation[];
  candidateCount: number;
}

export interface RecipeFeedbackV1Response {
  accepted: true;
  duplicate: boolean;
  clientSubmissionId: string;
}

export interface RecipeApiV1Detail {
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
  source: {
    provider: string;
    external_id: string | null;
    title: string;
    source_url: string | null;
    license: string;
    attribution: string;
  };
  publishedAt: string;
  publicationEvidence: RecipePublicationEvidence;
}

export class RecipeApiV1ClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly retryAfter: number | null;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    requestId?: string | null;
    retryAfter?: number | null;
  }) {
    super(options.message);
    this.name = "RecipeApiV1ClientError";
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId ?? null;
    this.retryAfter = options.retryAfter ?? null;
  }
}

type ApiResponseGuard<T> = (value: unknown) => value is T;

function invalidResponse(requestId: string | null = null): never {
  throw new RecipeApiV1ClientError({
    code: "INVALID_RESPONSE",
    message: "레시피 응답 형식을 확인하지 못했습니다.",
    status: 502,
    requestId,
  });
}

function parseApiResponse<T>(
  value: unknown,
  guard: ApiResponseGuard<T>,
  requestId: string | null = null,
): T {
  if (!guard(value)) invalidResponse(requestId);
  return value;
}

export function parseRecipeApiV1ListData(
  value: unknown,
  requestId: string | null = null,
): RecipeApiV1ListData {
  return parseApiResponse(value, isRecipeApiV1ListData, requestId);
}

export function parseRecipeApiV1RecommendationData(
  value: unknown,
  requestId: string | null = null,
): RecipeApiV1RecommendationData {
  return parseApiResponse(value, isRecipeApiV1RecommendationData, requestId);
}

export function parseRecipeFeedbackV1Response(
  value: unknown,
  requestId: string | null = null,
): RecipeFeedbackV1Response {
  return parseApiResponse(value, isRecipeFeedbackV1Response, requestId);
}

export function parseRecipeApiV1Detail(
  value: unknown,
  requestId: string | null = null,
): RecipeApiV1Detail {
  return parseApiResponse(value, isRecipeApiV1Detail, requestId);
}

function resolveApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function safeRequestId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9A-Za-z._:-]{1,128}$/.test(value)
    ? value
    : null;
}

function successRequestId(
  response: Response,
  payload: Record<string, unknown> | null,
): string | null {
  const meta = asObject(payload?.meta);
  return safeRequestId(response.headers.get("x-request-id")) ?? safeRequestId(meta?.requestId);
}

async function readApiData<T>(
  response: Response,
  parser: (value: unknown, requestId?: string | null) => T,
): Promise<T> {
  const payload = asObject(await readJson(response));
  if (!response.ok) {
    const error = asObject(payload?.error);
    const retryAfterHeader = Number(response.headers.get("retry-after"));
    throw new RecipeApiV1ClientError({
      code: typeof error?.code === "string" ? error.code : "INTERNAL_ERROR",
      message:
        typeof error?.message === "string"
          ? error.message
          : "레시피 정보를 불러오지 못했습니다.",
      status: response.status,
      requestId: typeof error?.requestId === "string" ? error.requestId : null,
      retryAfter: Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : null,
    });
  }
  if (!("data" in (payload ?? {}))) {
    invalidResponse(successRequestId(response, payload));
  }
  return parser(payload?.data, successRequestId(response, payload));
}

export function resolveIngredientCatalogIds(names: string[]): string[] {
  return [
    ...new Set(
      names
        .map((name) => ingredientIdByExactName.get(name.trim().toLowerCase()) ?? null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

export function ingredientCatalogName(id: string): string {
  return ingredientById.get(id)?.name ?? id;
}

export function recipeApiV1CardToRecord(card: RecipeApiV1Card): RecipeRecord {
  const ingredientNames = [...new Set([...card.matchedIngredientIds, ...card.missingIngredientIds])]
    .map(ingredientCatalogName);
  return {
    id: card.id,
    ...(card.slug ? { slug: card.slug } : {}),
    title: card.title,
    summary: card.summary,
    name: card.title,
    category: card.category.label,
    method: "",
    calories: "",
    thumbnailUrl: card.thumbnailUrl,
    ingredients: ingredientNames.join(", "),
    hashTag: "",
    difficultyLevel:
      card.difficulty >= 1 && card.difficulty <= 3
        ? (card.difficulty as 1 | 2 | 3)
        : null,
    beginnerScore: null,
    totalMinutes: card.totalTimeMinutes,
    servings: card.servings,
    activeMinutes: null,
    requiredTools: card.tools,
    homeCardCopy: null,
    noFire: null,
    microwave: card.tools.some((tool) => tool.includes("전자레인지")),
    fallbackMeal: null,
    source: null,
    safety: null,
    releaseTier: null,
    publishStatus: "published",
    publicationEvidence: card.publicationEvidence,
  };
}

export function recipeApiV1CardToMatch(card: RecipeApiV1Card): RecipeApiV1MatchedCard {
  const matchedIngredients = card.matchedIngredientIds.map(ingredientCatalogName);
  const missingIngredients = card.missingIngredientIds.map(ingredientCatalogName);
  const ingredientList = [...new Set([...matchedIngredients, ...missingIngredients])];
  return {
    ...recipeApiV1CardToRecord(card),
    ingredientList,
    matchRate:
      card.requiredIngredientCount > 0
        ? Math.round((card.ownedIngredientCount / card.requiredIngredientCount) * 100)
        : 0,
    matchedIngredients,
    missingIngredients,
    totalRecipeIngredients: card.requiredIngredientCount,
    requiredIngredientCount: card.requiredIngredientCount,
    ownedIngredientCount: card.ownedIngredientCount,
    recommendationReason: card.recommendationReason,
  };
}

function quantityDisplay(quantity: RecipeApiV1Detail["ingredients"][number]["quantity"]): string {
  if (quantity.text?.trim()) return quantity.text.trim();
  const value = quantity.value === null ? "" : String(quantity.value);
  return `${value}${quantity.unit?.trim() ?? ""}`.trim();
}

function substitutionDisplay(
  substitution: RecipeApiV1Detail["ingredients"][number]["substitutions"][number] | undefined,
): string | null {
  if (!substitution) return null;
  const name = substitution.text?.trim()
    || (substitution.ingredientId ? ingredientCatalogName(substitution.ingredientId) : "");
  if (!name) return null;
  return [name, substitution.ratio?.trim(), substitution.caution?.trim()].filter(Boolean).join(" · ");
}

export function recipeApiV1DetailToRecord(detail: RecipeApiV1Detail): RecipeDetailRecord {
  const ingredientDetails = detail.ingredients.map((ingredient) => ({
    name: ingredient.displayName,
    display: quantityDisplay(ingredient.quantity),
    amount:
      ingredient.quantity.text?.trim()
      || (ingredient.quantity.value === null ? null : String(ingredient.quantity.value)),
    unit: ingredient.quantity.unit,
    required: !ingredient.optional,
    substitute: substitutionDisplay(ingredient.substitutions[0]),
    prepNote: ingredient.preparation,
  }));
  const steps = detail.steps.map((step) => ({
    index: step.order,
    order: step.order,
    title: step.title,
    action: null,
    description: step.instruction,
    imageUrl: step.imageUrl,
    heat: step.heatLevel,
    minutes: Math.ceil(step.durationSeconds.min / 60),
    durationSecondsMin: step.durationSeconds.min,
    durationSecondsMax: step.durationSeconds.max,
    timerPresetSeconds: step.durationSeconds.timerPreset,
    beginnerTip: step.safetyNote,
    visualCue: step.cues.visual,
    rescueTip: step.recoveryTip,
  }));

  return {
    id: detail.id,
    version: detail.version,
    ...(detail.slug ? { slug: detail.slug } : {}),
    title: detail.title,
    summary: detail.summary,
    name: detail.title,
    category: detail.category.label,
    method: "",
    calories: "",
    thumbnailUrl: detail.thumbnailUrl,
    ingredients: ingredientDetails.map((ingredient) => ingredient.name).join(", "),
    hashTag: "",
    ingredientList: ingredientDetails.map((ingredient) => ingredient.name),
    ingredientDetails,
    steps,
    difficulty: detail.difficulty,
    difficultyLevel:
      detail.difficulty >= 1 && detail.difficulty <= 3
        ? (detail.difficulty as 1 | 2 | 3)
        : null,
    beginnerScore: null,
    cookingTime: detail.cookTimeMinutes,
    totalMinutes: detail.totalTimeMinutes,
    activeMinutes: detail.prepTimeMinutes + detail.cookTimeMinutes,
    servings: detail.servings,
    requiredTools: detail.tools,
    beginnerSummary: detail.summary,
    safetyNotes: detail.safetyNotes,
    storageTip: detail.storageGuide,
    reheatTip: detail.reheatingGuide,
    sourceProvider: detail.source.provider,
    sourceExternalId: detail.source.external_id,
    sourceUrl: detail.source.source_url,
    sourceAttribution: detail.source.attribution,
    sourceLicense: detail.source.license,
    contentOrigin: null,
    reviewedForBeginner: detail.publicationEvidence.reviewedForBeginner,
    noFire: detail.steps.every((step) => step.heatLevel === "불 없음"),
    microwave: detail.tools.some((tool) => tool.includes("전자레인지")),
    fallbackMeal: null,
    source: null,
    safety: null,
    releaseTier: null,
    publishStatus: "published",
    publicationEvidence: detail.publicationEvidence,
  };
}

export async function fetchRecipeListV1(
  input: {
    q?: string | null;
    category?: CanonicalRecipeCategoryId | null;
    difficulty?: number | null;
    maxTotalTime?: number | null;
    maxMissingIngredients?: number | null;
    ingredientIds?: string[];
    excludeIngredientIds?: string[];
    sort?: RecipeApiV1Sort;
    cursor?: string | null;
    limit?: number;
  },
  signal?: AbortSignal,
): Promise<RecipeApiV1ListData> {
  const params = new URLSearchParams();
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.category) params.set("category", input.category);
  if (input.difficulty) params.set("difficulty", String(input.difficulty));
  if (input.maxTotalTime) params.set("maxTotalTime", String(input.maxTotalTime));
  if (input.maxMissingIngredients !== null && input.maxMissingIngredients !== undefined) {
    params.set("maxMissingIngredients", String(input.maxMissingIngredients));
  }
  if (input.ingredientIds?.length) params.set("ingredientIds", input.ingredientIds.join(","));
  if (input.excludeIngredientIds?.length) {
    params.set("excludeIngredientIds", input.excludeIngredientIds.join(","));
  }
  params.set("sort", input.sort ?? "recommended");
  if (input.cursor) params.set("cursor", input.cursor);
  params.set("limit", String(Math.min(Math.max(input.limit ?? 24, 1), 50)));

  const response = await fetch(resolveApiUrl(`/api/v1/recipes?${params.toString()}`), {
    cache: "no-store",
    signal,
  });
  return readApiData(response, parseRecipeApiV1ListData);
}

export async function fetchRecipeRecommendationsV1(
  input: {
    ingredientIds: string[];
    expiringIngredientIds?: string[];
    excludedIngredientIds?: string[];
    maxTime?: number | null;
    difficulty?: number | null;
    maxMissingIngredients?: number;
    servings?: number;
    limit?: number;
  },
  signal?: AbortSignal,
): Promise<RecipeApiV1RecommendationData> {
  const response = await fetch(resolveApiUrl("/api/v1/recommendations"), {
    method: "POST",
    cache: "no-store",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readApiData(response, parseRecipeApiV1RecommendationData);
}

export async function submitRecipeFeedbackV1(
  input: RecipeFeedbackV1Input,
  accessToken: string,
  signal?: AbortSignal,
): Promise<RecipeFeedbackV1Response> {
  const response = await fetch(resolveApiUrl("/api/v1/recipe-feedback"), {
    method: "POST",
    cache: "no-store",
    signal,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readApiData(response, parseRecipeFeedbackV1Response);
}

export async function fetchRecipeDetailV1(
  id: string,
  signal?: AbortSignal,
): Promise<RecipeApiV1Detail> {
  const response = await fetch(resolveApiUrl(`/api/v1/recipes/${encodeURIComponent(id)}`), {
    cache: "no-store",
    signal,
  });
  return readApiData(response, parseRecipeApiV1Detail);
}
