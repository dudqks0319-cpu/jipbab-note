// 이 파일은 사람 검수 통계와 분리된 Phase 6 기술 E2E 전용 레시피와 세션을 안전하게 제공합니다.
import { createHmac } from "node:crypto";
import type {
  PublicRecipeListQuery,
  PublicRecipeListResult,
  RecipeV1Card,
  RecipeV1Detail,
} from "./recipe-api-v1-repository.ts";
import type { RecipePublicationEvidence } from "../types/index.ts";

type FixtureEnvironment = Partial<Record<string, string | undefined>>;
type HeaderReader = { get(name: string): string | null };

export const PHASE6_E2E_FIXTURE_RECIPE_ID = "00000000-0000-4000-8000-0000000006e1";
export const PHASE6_E2E_FIXTURE_COOKIE = "jipbab-phase6-fixture";
export const PHASE6_E2E_FIXTURE_SESSION_SECONDS = 10 * 60;

const FIXTURE_PUBLISHED_AT = "2026-07-11T00:00:00.000Z";
const FIXTURE_EVIDENCE: RecipePublicationEvidence = {
  reviewStatus: "approved",
  reviewedForBeginner: true,
  beginnerReviewedAt: FIXTURE_PUBLISHED_AT,
  actualCookingTested: true,
  actualCookingTestedAt: FIXTURE_PUBLISHED_AT,
  foodSafetyReviewed: true,
  foodSafetyReviewedAt: FIXTURE_PUBLISHED_AT,
  imageRightsStatus: "no_image_approved",
  imageRightsReviewedAt: FIXTURE_PUBLISHED_AT,
  sourceRecorded: true,
  sourceReviewedAt: FIXTURE_PUBLISHED_AT,
  publishedAt: FIXTURE_PUBLISHED_AT,
  reviewer: "phase6-technical-fixture",
  requirementsVerified: true,
};

const FIXTURE_REQUIRED_INGREDIENT_IDS = ["dairy-egg", "dairy-tofu", "veg-green-onion"];

const FIXTURE_DETAIL: RecipeV1Detail = {
  id: PHASE6_E2E_FIXTURE_RECIPE_ID,
  slug: "phase6-egg-tofu-pan",
  version: 1,
  schemaVersion: 2,
  isTestFixture: true,
  title: "계란 두부 한 팬",
  summary: "계란과 두부로 시작해 대파 한 가지만 더하면 완성하는 기술 E2E 전용 레시피예요.",
  category: { id: "egg", label: "달걀" },
  cuisineType: "한식",
  difficulty: 1,
  servings: 2,
  prepTimeMinutes: 3,
  cookTimeMinutes: 7,
  totalTimeMinutes: 10,
  thumbnailUrl: null,
  tools: ["24cm 프라이팬", "뒤집개"],
  ingredients: [
    {
      id: "00000000-0000-4000-8000-000000000611",
      ingredientId: "dairy-egg",
      groupType: "main",
      displayName: "계란",
      quantity: { value: 2, text: null, unit: "개" },
      preparation: "그릇에 풀어두기",
      optional: false,
      pantryStaple: false,
      substitutions: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000612",
      ingredientId: "dairy-tofu",
      groupType: "main",
      displayName: "두부",
      quantity: { value: 1, text: null, unit: "모" },
      preparation: "키친타월로 물기 닦기",
      optional: false,
      pantryStaple: false,
      substitutions: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000613",
      ingredientId: "veg-green-onion",
      groupType: "main",
      displayName: "대파",
      quantity: { value: 10, text: null, unit: "g" },
      preparation: "송송 썰기",
      optional: false,
      pantryStaple: false,
      substitutions: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000614",
      ingredientId: "season-soy-dark",
      groupType: "seasoning",
      displayName: "진간장",
      quantity: { value: 1, text: null, unit: "큰술" },
      preparation: null,
      optional: true,
      pantryStaple: true,
      substitutions: [],
    },
  ],
  steps: [
    {
      id: "00000000-0000-4000-8000-000000000621",
      order: 1,
      title: "두부 데우기",
      instruction: "중불로 달군 프라이팬에 두부를 올려 앞뒤를 가볍게 데워요.",
      heatLevel: "중불",
      durationSeconds: { min: 30, max: 60, timerPreset: 30 },
      cues: { visual: "두부 표면의 물기가 사라지면 다음 단계로 가요.", sound: null, smell: null },
      safetyNote: "기름이 튀지 않도록 두부 물기를 먼저 닦아요.",
      recoveryTip: "팬에 붙으면 불을 약하게 줄이고 10초 기다렸다가 뒤집어요.",
      imageUrl: null,
      ingredientUsages: [{ recipeIngredientId: "00000000-0000-4000-8000-000000000612", usageText: "두부 1모" }],
    },
    {
      id: "00000000-0000-4000-8000-000000000622",
      order: 2,
      title: "계란 익히기",
      instruction: "약불로 줄이고 풀어둔 계란을 부어 가장자리부터 천천히 섞어요.",
      heatLevel: "약불",
      durationSeconds: { min: 90, max: 120, timerPreset: 90 },
      cues: { visual: "계란의 젖은 부분이 거의 보이지 않으면 익은 상태예요.", sound: null, smell: null },
      safetyNote: "날계란이 남지 않도록 중심까지 익혀요.",
      recoveryTip: "바닥이 빨리 갈색이 되면 팬을 10초간 불에서 내려요.",
      imageUrl: null,
      ingredientUsages: [{ recipeIngredientId: "00000000-0000-4000-8000-000000000611", usageText: "계란 2개" }],
    },
    {
      id: "00000000-0000-4000-8000-000000000623",
      order: 3,
      title: "간 맞추기",
      instruction: "대파와 진간장을 넣고 30초 섞은 뒤 불을 꺼요.",
      heatLevel: "약불",
      durationSeconds: { min: 30, max: 45, timerPreset: null },
      cues: { visual: "대파 색이 선명하고 간장이 고르게 묻으면 완성이에요.", sound: null, smell: null },
      safetyNote: "간장을 넣을 때 얼굴을 팬에서 멀리해요.",
      recoveryTip: "짜면 물 1큰술을 넣고 10초 더 섞어요.",
      imageUrl: null,
      ingredientUsages: [
        { recipeIngredientId: "00000000-0000-4000-8000-000000000613", usageText: "대파 10g" },
        { recipeIngredientId: "00000000-0000-4000-8000-000000000614", usageText: "진간장 1큰술" },
      ],
    },
  ],
  safetyNotes: ["계란은 흰자와 노른자가 모두 굳을 때까지 익혀요."],
  storageGuide: "식힌 뒤 밀폐 용기에 담아 냉장 보관하고 하루 안에 먹어요.",
  reheatingGuide: "전자레인지에서 30초씩 나누어 중심까지 따뜻하게 데워요.",
  source: {
    provider: "jipbab-note",
    external_id: "phase6-e2e-fixture-v1",
    title: "Phase 6 기술 E2E fixture",
    source_url: null,
    license: "internal-test-only",
    attribution: "기술 E2E 전용이며 실제 조리·초보자·안전 검수 통계에 포함하지 않습니다.",
  },
  publishedAt: FIXTURE_PUBLISHED_AT,
  publicationEvidence: FIXTURE_EVIDENCE,
};

function secureTokenMatches(received: string, expected: string): boolean {
  if (received.length !== expected.length || received.length < 12) return false;
  let difference = 0;
  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function fixtureEnvironmentIsEnabled(env: FixtureEnvironment): boolean {
  if (env.APP_ENV === "production" || env.VERCEL_ENV === "production") return false;
  if (env.APP_ENV !== "staging" && env.NODE_ENV !== "test") return false;
  return env.PHASE6_E2E_FIXTURE_ENABLED === "true";
}

function expectedFixtureToken(env: FixtureEnvironment): string {
  return env.PHASE6_E2E_FIXTURE_TOKEN?.trim() ?? "";
}

function signFixtureSession(expiresAt: number, token: string): string {
  return createHmac("sha256", token)
    .update(`phase6-fixture-session:${expiresAt}`)
    .digest("base64url");
}

function readCookie(headers: HeaderReader, name: string): string {
  const cookieHeader = headers.get("cookie") ?? "";
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    return pair.slice(separator + 1).trim();
  }
  return "";
}

export function createPhase6E2EFixtureSession(
  headers: HeaderReader,
  env: FixtureEnvironment = process.env,
  now = Date.now(),
): string | null {
  if (!fixtureEnvironmentIsEnabled(env)) return null;
  const expected = expectedFixtureToken(env);
  const authorization = headers.get("authorization")?.trim() ?? "";
  const received = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!secureTokenMatches(received, expected)) return null;
  const expiresAt = Math.floor(now / 1000) + PHASE6_E2E_FIXTURE_SESSION_SECONDS;
  return `${expiresAt}.${signFixtureSession(expiresAt, expected)}`;
}

export function shouldUsePhase6E2EFixture(
  headers: HeaderReader,
  env: FixtureEnvironment = process.env,
  now = Date.now(),
): boolean {
  if (!fixtureEnvironmentIsEnabled(env)) return false;
  const expected = expectedFixtureToken(env);
  const session = readCookie(headers, PHASE6_E2E_FIXTURE_COOKIE);
  const separator = session.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = Number(session.slice(0, separator));
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;
  return secureTokenMatches(session.slice(separator + 1), signFixtureSession(expiresAt, expected));
}

export function getPhase6E2EFixtureDetail(recipeId: string): RecipeV1Detail | null {
  return recipeId === PHASE6_E2E_FIXTURE_RECIPE_ID ? structuredClone(FIXTURE_DETAIL) : null;
}

function buildFixtureCard(ownedIngredientIds: string[]): RecipeV1Card {
  const owned = new Set(ownedIngredientIds);
  const matchedIngredientIds = FIXTURE_REQUIRED_INGREDIENT_IDS.filter((id) => owned.has(id));
  const missingIngredientIds = FIXTURE_REQUIRED_INGREDIENT_IDS.filter((id) => !owned.has(id));
  return {
    id: FIXTURE_DETAIL.id,
    slug: FIXTURE_DETAIL.slug,
    isTestFixture: true,
    title: FIXTURE_DETAIL.title,
    summary: FIXTURE_DETAIL.summary,
    category: FIXTURE_DETAIL.category,
    difficulty: FIXTURE_DETAIL.difficulty,
    servings: FIXTURE_DETAIL.servings,
    totalTimeMinutes: FIXTURE_DETAIL.totalTimeMinutes,
    thumbnailUrl: FIXTURE_DETAIL.thumbnailUrl,
    tools: FIXTURE_DETAIL.tools,
    requiredIngredientCount: FIXTURE_REQUIRED_INGREDIENT_IDS.length,
    ownedIngredientCount: matchedIngredientIds.length,
    matchedIngredientIds,
    missingIngredientIds,
    recommendationReason: missingIngredientIds.length === 0
      ? "필수 재료가 모두 있어 바로 만들 수 있어요."
      : `필수 재료 ${FIXTURE_REQUIRED_INGREDIENT_IDS.length}개 중 ${matchedIngredientIds.length}개가 있어요.`,
    publishedAt: FIXTURE_DETAIL.publishedAt,
    publicationEvidence: FIXTURE_EVIDENCE,
  };
}

export function listPhase6E2EFixtureRecipes(input: PublicRecipeListQuery): PublicRecipeListResult {
  const card = buildFixtureCard(input.ingredientIds);
  const excluded = new Set(input.excludeIngredientIds);
  const searchableText = `${card.title} ${card.summary}`.toLowerCase();
  const visible = (
    (!input.query || searchableText.includes(input.query.toLowerCase()))
    && (!input.categoryId || card.category.id === input.categoryId)
    && (!input.difficulty || card.difficulty === input.difficulty)
    && (!input.maxTotalTime || card.totalTimeMinutes <= input.maxTotalTime)
    && (input.maxMissingIngredients === null || card.missingIngredientIds.length <= input.maxMissingIngredients)
    && !FIXTURE_DETAIL.ingredients.some((ingredient) => excluded.has(ingredient.ingredientId))
    && input.limit > 0
  );
  return { recipes: visible ? [card] : [], nextCursor: null };
}
