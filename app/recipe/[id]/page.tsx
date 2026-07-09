// 이 파일은 레시피 상세 화면을 담당합니다 - 큰 이미지, 재료 목록, 조리 순서를 제공합니다.
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  BookOpenText,
  ChevronLeft,
  Clock3,
  HelpCircle,
  NotebookText,
  Play,
  Ruler,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import RecipeImage from "@/components/recipe/RecipeImage";
import RecipeCookMode from "@/components/recipe/RecipeCookMode";
import RecipeComments from "@/components/recipe/RecipeComments";
import RecipeFavoriteButton from "@/components/recipe/RecipeFavoriteButton";
import RecipeInstructionView from "@/components/recipe/RecipeInstructionView";
import RecipeShareButton from "@/components/recipe/RecipeShareButton";
import RecipeShoppingAssistant from "@/components/recipe/RecipeShoppingAssistant";
import { findCuratedRecipe } from "@/lib/curated-recipes";
import { isBeginnerRecipeGeneratedImage } from "@/lib/recipe-images";
import { normalizeHttpUrl } from "@/lib/request-security";
import type { RecipeDetailRecord, RecipeDetailStep, RecipeIngredientDetail } from "@/types";

const SERVICE_ID = "COOKRCP01";
const BASE_URL = "https://openapi.foodsafetykorea.go.kr/api";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FALLBACK_IMAGE =
  "/images/recipes/kimchi-fried-rice.png";
const DEFAULT_DETAIL_MEASUREMENT_TIPS = [
  "1큰술 = 밥숟가락 평평하게 1번 = 약 15ml",
  "1작은술 = 티스푼 평평하게 1번 = 약 5ml",
  "1컵 = 일반 종이컵 1컵 = 약 180ml",
  "한줌 = 한 손으로 가볍게 집히는 양 = 약 30~50g",
];
const DEFAULT_KNOW_HOW_ITEMS = [
  { title: "손질 순서", detail: "씻기, 물기 제거, 먹기 좋은 크기 순서로 준비하세요." },
  { title: "불 조절", detail: "처음엔 중불, 타기 시작하면 약불로 낮추면 실패가 줄어요." },
  { title: "간 맞추기", detail: "양념은 한 번에 다 넣지 말고 마지막에 조금씩 보정하세요." },
  { title: "보관", detail: "남은 음식은 한 김 식힌 뒤 밀폐 용기에 담으세요." },
];
const INGREDIENT_SPLIT_PLACEHOLDER = "__JIPBAB_FRACTION_SLASH__";
const INGREDIENT_SECTION_LABEL_PATTERN =
  /^(?:주재료|부재료|양념|양념장|소스|고명|육수|반죽|반죽재료|속재료|초코필링|토핑)$/;
const INGREDIENT_QUANTITY_FRAGMENT_PATTERN =
  /^[0-9]+(?:\.[0-9]+)?\s*(?:kg|g|mg|ml|l|cm|mm|컵|큰술|작은술|술|스푼|ts|tbsp|tsp|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌|통|단|포기)$/i;
const INGREDIENT_FRACTION_DENOMINATOR_PATTERN =
  /^([2-9][0-9]*)\s*(개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌|컵|큰술|작은술|술|스푼|통|단|포기)$/i;
const INGREDIENT_MEASUREMENT_PATTERN =
  /\d+(?:\.\d+)?\s*(?:kg|g|mg|ml|l|컵|큰술|작은술|술|스푼|ts|tbsp|tsp|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌|통|단|포기)/i;

type MfdsRecipeRow = {
  RCP_SEQ?: string;
  RCP_NM?: string;
  RCP_WAY2?: string;
  RCP_PAT2?: string;
  INFO_ENG?: string;
  ATT_FILE_NO_MAIN?: string;
  ATT_FILE_NO_MK?: string;
  RCP_PARTS_DTLS?: string;
  HASH_TAG?: string;
  [key: string]: string | undefined;
};

type MfdsResponse = {
  COOKRCP01?: {
    row?: MfdsRecipeRow[];
  };
};

type SupabaseRecipeRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: number | null;
  cooking_time: number | null;
  servings: number | null;
  thumbnail_url: string | null;
  ingredients: unknown;
  steps: unknown;
  source: string | null;
  content_origin: RecipeDetailRecord["contentOrigin"] | null;
  reviewed_for_beginner: boolean | null;
  recipe_sources:
    | {
        provider: string | null;
        external_id: string | null;
        source_url: string | null;
        license: string | null;
        attribution: string | null;
      }
    | Array<{
        provider: string | null;
        external_id: string | null;
        source_url: string | null;
        license: string | null;
        attribution: string | null;
      }>
    | null;
};

const normalizeRecipeImageUrl = (value: string | null | undefined): string | null => {
  return normalizeHttpUrl(value);
};

const cleanIngredientDisplayText = (value: string): string => {
  const colonIndex = value.lastIndexOf(":");
  const withoutLabel = colonIndex === -1 ? value : value.slice(colonIndex + 1);

  return withoutLabel
    .replace(/^[-•·*]\s*/, "")
    .replace(/[，、]/g, ",")
    .replace(/\s+/g, " ")
    .replace(/\b([0-2])\s+([0-9])(?=\s*(?:g|kg|mg|ml|l)\b)/gi, "$1.$2")
    .trim();
};

const dedupeIngredientDisplayList = (items: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const item of items) {
    const key = item.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
};

const normalizeIngredientDisplayItems = (items: string[]): string[] => {
  const cleaned = items
    .map(cleanIngredientDisplayText)
    .filter((item) => item.length > 0)
    .filter((item) => !INGREDIENT_SECTION_LABEL_PATTERN.test(item));
  const normalized: string[] = [];

  for (let index = 0; index < cleaned.length; index += 1) {
    const current = cleaned[index];
    const next = cleaned[index + 1];
    const fractionNumerator = current.match(/^(.*\S)\s+([1-9])$/);
    const fractionDenominator = next?.match(INGREDIENT_FRACTION_DENOMINATOR_PATTERN);

    if (fractionNumerator && fractionDenominator) {
      normalized.push(`${fractionNumerator[1]} ${fractionNumerator[2]}/${fractionDenominator[1]}${fractionDenominator[2]}`);
      index += 1;
      continue;
    }

    if (INGREDIENT_QUANTITY_FRAGMENT_PATTERN.test(current)) {
      continue;
    }

    normalized.push(
      INGREDIENT_MEASUREMENT_PATTERN.test(current) ? current.replace(/\s+[1-9]$/, "") : current,
    );
  }

  return dedupeIngredientDisplayList(normalized);
};

const splitIngredientDisplayText = (rawIngredients: string): string[] => {
  return rawIngredients
    .replace(/(\d)\s*\/\s*(\d)/g, `$1${INGREDIENT_SPLIT_PLACEHOLDER}$2`)
    .split(/[\n,;|/]+/g)
    .map((item) => item.replaceAll(INGREDIENT_SPLIT_PLACEHOLDER, "/"));
};

const parseIngredientDisplayList = (rawIngredients: string): string[] => {
  if (!rawIngredients) {
    return [];
  }

  return normalizeIngredientDisplayItems(splitIngredientDisplayText(rawIngredients));
};

const parseSteps = (row: MfdsRecipeRow): RecipeDetailStep[] => {
  const steps: RecipeDetailStep[] = [];

  for (let index = 1; index <= 20; index += 1) {
    const key = String(index).padStart(2, "0");
    const description = row[`MANUAL${key}`]?.trim();
    const imageUrl = normalizeRecipeImageUrl(row[`MANUAL_IMG${key}`]?.trim() || null);

    if (!description) {
      continue;
    }

    steps.push({
      index,
      description,
      imageUrl,
    });
  }

  if (steps.length > 0) {
    return steps;
  }

  return [
    { index: 1, description: "재료를 깨끗하게 손질하고 필요한 양을 준비합니다.", imageUrl: null },
    { index: 2, description: "조리법에 맞춰 가열하고, 중간에 간을 맞춰가며 조리합니다.", imageUrl: null },
    { index: 3, description: "불을 끄고 플레이팅한 뒤, 기호에 맞게 마무리합니다.", imageUrl: null },
  ];
};

const parseHashTags = (rawTag: string): string[] => {
  if (!rawTag) {
    return [];
  }

  return rawTag
    .split(/[\s,]+/g)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
};

const parseMethodAndCalories = (description: string | null): Pick<RecipeDetailRecord, "method" | "calories"> => {
  if (!description) {
    return { method: "정보 없음", calories: "-" };
  }

  const methodMatch = description.match(/조리법:\s*([^|]+)/);
  const caloriesMatch = description.match(/열량:\s*([^|]+)/);

  return {
    method: methodMatch?.[1]?.trim() || description,
    calories: caloriesMatch?.[1]?.trim() || "-",
  };
};

const normalizeIngredientList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return normalizeIngredientDisplayItems(value.map((item) => (typeof item === "string" ? item : "")));
  }
  if (typeof value === "string") {
    return parseIngredientDisplayList(value);
  }
  return [];
};

const inferIngredientName = (display: string): string => {
  return display
    .replace(/\s+\d+(?:\.\d+)?\s*(?:kg|g|mg|ml|l|컵|큰술|작은술|술|스푼|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌|통|단|포기).*$/i, "")
    .replace(/\s+(?:약간|조금|적당량)$/i, "")
    .trim() || display.trim();
};

const normalizeIngredientDetails = (value: unknown): RecipeIngredientDetail[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): RecipeIngredientDetail | null => {
      if (typeof item === "string") {
        const display = cleanIngredientDisplayText(item);
        if (!display || INGREDIENT_SECTION_LABEL_PATTERN.test(display)) {
          return null;
        }
        return {
          name: inferIngredientName(display),
          display,
          required: true,
          substitute: null,
          beginnerNote: null,
          prepNote: null,
        } satisfies RecipeIngredientDetail;
      }

      if (typeof item !== "object" || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const rawDisplay = typeof record.display === "string" ? record.display.trim() : "";
      const amount = typeof record.amount === "string" ? record.amount.trim() : "";
      const unit = typeof record.unit === "string" ? record.unit.trim() : "";
      const display = rawDisplay || [amount, unit].filter(Boolean).join("");

      if (!name || !display) {
        return null;
      }

      return {
        name,
        display,
        amount: amount || null,
        unit: unit || null,
        required: typeof record.required === "boolean" ? record.required : true,
        substitute:
          typeof record.substitute === "string"
            ? record.substitute.trim()
            : typeof record.substitute_ingredient === "string"
              ? record.substitute_ingredient.trim()
              : null,
        beginnerNote:
          typeof record.beginnerNote === "string"
            ? record.beginnerNote.trim()
            : typeof record.beginner_note === "string"
              ? record.beginner_note.trim()
              : null,
        prepNote:
          typeof record.prepNote === "string"
            ? record.prepNote.trim()
            : typeof record.prep_note === "string"
              ? record.prep_note.trim()
              : null,
      } satisfies RecipeIngredientDetail;
    })
    .filter((item): item is RecipeIngredientDetail => item !== null);
};

const normalizeStepList = (value: unknown): RecipeDetailStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const getStringField = (record: Record<string, unknown>, ...keys: string[]): string | null => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return null;
  };

  const getNumberField = (record: Record<string, unknown>, ...keys: string[]): number | null => {
    for (const key of keys) {
      const value = record[key];
      const parsed =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? Number(value)
            : Number.NaN;
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return null;
  };

  const steps = value
    .map((item): RecipeDetailStep | null => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = getStringField(record, "title");
      const action = getStringField(record, "action");
      const description = getStringField(record, "description") ?? action ?? "";
      if (!description) {
        return null;
      }

      const rawIndex = record.order ?? record.index;
      const parsedIndex =
        typeof rawIndex === "number"
          ? rawIndex
          : typeof rawIndex === "string"
            ? Number(rawIndex)
            : Number.NaN;

      const imageFromSnake = record.image_url;
      const imageFromCamel = record.imageUrl;
      const imageUrl =
        typeof imageFromSnake === "string"
          ? imageFromSnake
          : typeof imageFromCamel === "string"
            ? imageFromCamel
            : null;

      return {
        index: Number.isFinite(parsedIndex) && parsedIndex > 0 ? Math.floor(parsedIndex) : 0,
        title,
        action,
        description,
        imageUrl: normalizeRecipeImageUrl(imageUrl),
        heat: getStringField(record, "heat"),
        minutes: getNumberField(record, "minutes", "minute", "duration_minutes"),
        beginnerTip:
          typeof record.beginnerTip === "string"
            ? record.beginnerTip.trim()
            : typeof record.beginner_tip === "string"
              ? record.beginner_tip.trim()
              : null,
        visualCue:
          typeof record.visualCue === "string"
            ? record.visualCue.trim()
            : typeof record.visual_cue === "string"
              ? record.visual_cue.trim()
              : null,
        commonMistake:
          typeof record.commonMistake === "string"
            ? record.commonMistake.trim()
            : typeof record.common_mistake === "string"
              ? record.common_mistake.trim()
              : null,
        rescueTip:
          typeof record.rescueTip === "string"
            ? record.rescueTip.trim()
            : typeof record.rescue_tip === "string"
              ? record.rescue_tip.trim()
              : null,
        imageAlt:
          typeof record.imageAlt === "string"
            ? record.imageAlt.trim()
            : typeof record.image_alt === "string"
              ? record.image_alt.trim()
              : null,
        imageCaption:
          typeof record.imageCaption === "string"
            ? record.imageCaption.trim()
            : typeof record.image_caption === "string"
              ? record.image_caption.trim()
              : null,
      } satisfies RecipeDetailStep;
    })
    .filter((item): item is RecipeDetailStep => item !== null)
    .map((item, idx): RecipeDetailStep => ({
      ...item,
      index: item.index > 0 ? item.index : idx + 1,
    }))
    .sort((a, b) => a.index - b.index);

  return steps;
};

async function fetchRecipeDetailFromSupabase(recipeId: string): Promise<RecipeDetailRecord | null> {
  if (!UUID_PATTERN.test(recipeId)) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await client
      .from("recipes")
      .select(`
        id,
        title,
        description,
        category,
        difficulty,
        cooking_time,
        servings,
        thumbnail_url,
        ingredients,
        steps,
        source,
        content_origin,
        reviewed_for_beginner,
        recipe_sources (
          provider,
          external_id,
          source_url,
          license,
          attribution
        )
      `)
      .eq("id", recipeId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as SupabaseRecipeRow;
    const parsedMeta = parseMethodAndCalories(row.description);
    const ingredientDetails = normalizeIngredientDetails(row.ingredients);
    const ingredientList = ingredientDetails.length > 0
      ? ingredientDetails.map((ingredientItem) => ingredientItem.name)
      : normalizeIngredientList(row.ingredients);
    const steps = normalizeStepList(row.steps);
    const sourceRecord = Array.isArray(row.recipe_sources)
      ? row.recipe_sources[0] ?? null
      : row.recipe_sources;
    const fallbackProvider = row.source?.startsWith("mfds:") ? "MFDS" : row.source;
    const fallbackExternalId = row.source?.startsWith("mfds:") ? row.source.replace(/^mfds:/, "") : null;
    const fallbackAttribution = row.source?.startsWith("mfds:") ? "식품의약품안전처 식품안전나라" : null;
    const fallbackLicense = row.source?.startsWith("mfds:") ? "공공데이터 OpenAPI" : null;

    return {
      id: row.id,
      name: row.title?.trim() || "레시피 이름 없음",
      category: row.category?.trim() || "기타",
      method: parsedMeta.method,
      calories: parsedMeta.calories,
      thumbnailUrl: normalizeRecipeImageUrl(row.thumbnail_url || null),
      ingredients: ingredientList.join(", "),
      hashTag: "",
      ingredientList,
      ingredientDetails,
      steps:
        steps.length > 0
          ? steps
          : [
              { index: 1, description: "재료를 깨끗하게 손질하고 필요한 양을 준비합니다.", imageUrl: null },
              { index: 2, description: "조리법에 맞춰 가열하고, 중간에 간을 맞춰가며 조리합니다.", imageUrl: null },
              { index: 3, description: "불을 끄고 플레이팅한 뒤, 기호에 맞게 마무리합니다.", imageUrl: null },
            ],
      difficulty: row.difficulty,
      cookingTime: row.cooking_time,
      servings: row.servings,
      sourceProvider: sourceRecord?.provider ?? fallbackProvider,
      sourceExternalId: sourceRecord?.external_id ?? fallbackExternalId,
      sourceUrl: normalizeHttpUrl(sourceRecord?.source_url),
      sourceAttribution: sourceRecord?.attribution ?? fallbackAttribution,
      sourceLicense: sourceRecord?.license ?? fallbackLicense,
      contentOrigin: row.content_origin ?? (row.source?.startsWith("mfds:") ? "public_api" : "licensed"),
      reviewedForBeginner: row.reviewed_for_beginner ?? false,
    };
  } catch (error) {
    console.error("Supabase 레시피 상세 조회 실패", error);
    return null;
  }
}

async function fetchRecipeDetail(recipeId: string): Promise<RecipeDetailRecord | null> {
  const curated = findCuratedRecipe(recipeId);
  if (curated) {
    return curated;
  }

  const fromSupabase = await fetchRecipeDetailFromSupabase(recipeId);
  if (fromSupabase) {
    return fromSupabase;
  }

  const apiKey = process.env.MFDS_API_KEY || process.env.FOODSAFETY_API_KEY;
  if (!apiKey) {
    return null;
  }

  const endpoint = `${BASE_URL}/${apiKey}/${SERVICE_ID}/json/1/5/RCP_SEQ=${encodeURIComponent(recipeId)}`;
  const response = await fetch(endpoint, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as MfdsResponse;
  const rows = payload.COOKRCP01?.row ?? [];
  const target = rows.find((row) => row.RCP_SEQ === recipeId) ?? rows[0];

  if (!target) {
    return null;
  }

  return {
    id: target.RCP_SEQ ?? recipeId,
    name: target.RCP_NM?.trim() ?? "레시피 이름 없음",
    category: target.RCP_PAT2?.trim() ?? "기타",
    method: target.RCP_WAY2?.trim() ?? "정보 없음",
    calories: target.INFO_ENG?.trim() ?? "-",
    thumbnailUrl: normalizeRecipeImageUrl(target.ATT_FILE_NO_MAIN || target.ATT_FILE_NO_MK || null),
    ingredients: target.RCP_PARTS_DTLS?.trim() ?? "",
    hashTag: target.HASH_TAG?.trim() ?? "",
    ingredientList: parseIngredientDisplayList(target.RCP_PARTS_DTLS?.trim() ?? ""),
    steps: parseSteps(target),
    sourceProvider: "MFDS",
    sourceExternalId: target.RCP_SEQ ?? recipeId,
    sourceUrl: "https://www.foodsafetykorea.go.kr",
    sourceAttribution: "식품의약품안전처 식품안전나라",
    sourceLicense: "공공데이터 OpenAPI",
    contentOrigin: "public_api",
    reviewedForBeginner: false,
  };
}

function formatDifficulty(difficulty: RecipeDetailRecord["difficulty"]): string {
  if (typeof difficulty === "number") {
    if (difficulty <= 1) return "쉬움";
    if (difficulty === 2) return "보통";
    return "어려움";
  }

  const label = difficulty?.toString().trim();
  return label || "쉬움";
}

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const recipe = await fetchRecipeDetail(id);

  if (!recipe) {
    return (
      <div className="px-5 py-10">
        <p className="rounded-2xl bg-rose-50 px-4 py-5 text-sm text-rose-500">
          레시피 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Link
          href="/recipe"
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600"
        >
          <ChevronLeft size={16} />
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const heroImage = recipe.thumbnailUrl || FALLBACK_IMAGE;
  const isGeneratedHeroImage = isBeginnerRecipeGeneratedImage(heroImage);
  const hasGeneratedRecipePhoto = isGeneratedHeroImage || heroImage.includes("/images/recipes/generated/");
  const visualGuideSteps = recipe.steps.filter((step) => Boolean(step.imageUrl));
  const visualGuideImage = recipe.recipeGuideImageUrl || recipe.recipeStepsImageUrl || recipe.recipePrepImageUrl || (hasGeneratedRecipePhoto ? heroImage : null);
  const hasRecipeVisualGuide = Boolean(
    recipe.recipePosterImageUrl ||
    visualGuideImage ||
    visualGuideSteps.length > 0,
  );
  const tags = parseHashTags(recipe.hashTag);
  const cookingMinutes = recipe.cookingTime ?? Math.min(Math.max(recipe.steps.length * 5 + 5, 15), 45);
  const servingLabel = `${recipe.servings ?? 2}인분`;
  const difficultyLabel = formatDifficulty(recipe.difficulty);
  const ingredientDetails = recipe.ingredientDetails?.length
      ? recipe.ingredientDetails
      : recipe.ingredientList.map((ingredientName) => ({
          name: ingredientName,
          display: "분량 확인 필요",
          required: true,
          substitute: null,
          beginnerNote: null,
          prepNote: null,
        } satisfies RecipeIngredientDetail));
  const guideIngredientDetails = ingredientDetails
    .filter((ingredient) => ingredient.required !== false)
    .slice(0, 6);
  const guideToolItems = recipe.requiredTools?.slice(0, 5) ?? [];
  const guidePrepItems = recipe.beforeStart?.slice(0, 3) ?? [];
  const measurementTips = recipe.measurementTips?.length
    ? recipe.measurementTips
    : DEFAULT_DETAIL_MEASUREMENT_TIPS;
  const sourceUrl = recipe.sourceUrl ?? normalizeHttpUrl(recipe.source?.sourceUrl);
  const sourceLabel = recipe.sourceAttribution
    ?? recipe.source?.sourceName
    ?? (recipe.id.startsWith("curated-") || recipe.id.startsWith("beginner-recipe-")
      ? "집밥노트 직접 큐레이션"
      : "출처 정보 확인 필요");
  const sourceLicense = recipe.sourceLicense
    ?? recipe.source?.licenseOrUsageNote
    ?? (recipe.id.startsWith("curated-") || recipe.id.startsWith("beginner-recipe-")
      ? "직접 작성/제작 콘텐츠"
      : "원천 데이터 기준 표시");
  const reviewedForBeginner = recipe.reviewedForBeginner ?? recipe.id.startsWith("curated-");
  const contentOriginLabel = {
    original: "집밥노트 직접 작성",
    public_api: "공공 API 기반",
    licensed: "허가/라이선스 콘텐츠",
    user_bookmark: "사용자 북마크",
  }[recipe.contentOrigin ?? (recipe.id.startsWith("curated-") ? "original" : "licensed")];

  const heroDescription = recipe.beginnerSummary || recipe.imageCaption || `${recipe.method}로 만드는 ${difficultyLabel} 난이도 집밥 레시피입니다.`;

  return (
    <div className="min-h-full bg-white pb-8 text-[#2b2b2b]">
      <section className="relative overflow-hidden bg-white">
        <div className="mobile-safe-top absolute left-4 top-0 z-20">
          <Link
            href="/recipe"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#242424] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            aria-label="레시피 목록으로 돌아가기"
          >
            <ChevronLeft size={18} />
          </Link>
        </div>
        <div className="mobile-safe-top absolute right-4 top-0 z-20 flex gap-2">
          <RecipeShareButton recipeName={recipe.name} recipeId={recipe.id} />
          <RecipeFavoriteButton
            id={recipe.id}
            name={recipe.name}
            category={recipe.category}
            thumbnailUrl={recipe.thumbnailUrl}
          />
        </div>

        <div className={`relative w-full overflow-hidden ${isGeneratedHeroImage ? "h-[248px] bg-[#fff8ef] min-[390px]:h-[268px]" : "h-[345px] bg-[#eee7dd] min-[390px]:h-[370px]"}`}>
          <RecipeImage
            src={heroImage}
            fallbackSrc={FALLBACK_IMAGE}
            alt={recipe.imageAlt || recipe.name}
            className="h-full w-full"
            imageClassName={`h-full w-full ${isGeneratedHeroImage ? "object-contain p-2" : "object-cover"}`}
          />
        </div>

        <div className="px-6 py-8">
          <p className="text-[12px] font-black text-[#78a95f]">{recipe.category} · {recipe.method} · {recipe.calories} kcal</p>
          <h1 className="mt-3 break-keep text-[34px] font-black leading-[1.22] tracking-normal text-[#2d2d2d] min-[390px]:text-[38px]">
            {recipe.name}
          </h1>
          <p className="mt-5 break-keep text-[19px] font-medium leading-[1.72] tracking-normal text-[#3a3a3a]">
            {heroDescription}
          </p>
          <div className="mt-7 grid grid-cols-4 gap-2 text-center">
            <DetailMetric icon={<Clock3 size={15} />} label={`${cookingMinutes}분`} />
            <DetailMetric icon={<Users size={15} />} label={servingLabel} />
            <DetailMetric icon={<Star size={15} />} label={difficultyLabel} />
            <DetailMetric icon={<ShoppingBasket size={15} />} label={`${recipe.ingredientList.length}개`} />
          </div>
        </div>
      </section>

      {tags.length > 0 && (
        <section className="flex flex-wrap gap-2 px-5 pt-4">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-[#eadcc9] bg-[#fffaf3] px-3 py-1.5 text-xs font-bold text-[#7d6d5f]">
              {tag}
            </span>
          ))}
        </section>
      )}

      <section className="bg-white px-5 pb-7 pt-2">
        <div className="grid grid-cols-4 gap-3">
          <QuickAction
            href={hasRecipeVisualGuide ? "#recipe-guide" : "#ingredients"}
            icon={hasRecipeVisualGuide ? <BookOpenText size={30} /> : <Search size={30} />}
            label={hasRecipeVisualGuide ? "사진+순서" : "재료 확인"}
            tone="orange"
          />
          <QuickAction href="#shopping-assistant" icon={<ShoppingBag size={30} />} label="장보기" tone="violet" />
          <QuickAction href="#recipe-qna" icon={<HelpCircle size={30} />} label="Q&A" tone="mint" />
          <QuickAction href="#recipe-notes" icon={<NotebookText size={30} />} label="노트" tone="blue" />
        </div>
      </section>

      {recipe.beginnerSummary ? (
        <section className="px-5 pt-5">
          <div className="jipbab-panel rounded-[16px] px-4 py-4">
            <p className="text-[13px] font-black text-[#2f2117]">처음 만들 때 핵심</p>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-[#5f4b3a]">{recipe.beginnerSummary}</p>
          </div>
        </section>
      ) : null}

      <section className="px-5 pt-4">
        <div className="rounded-[14px] border border-[#ece8e2] bg-[#fffaf3] px-4 py-3">
          <p className="text-[12px] font-black text-[#2f2117]">출처 요약</p>
          <p className="mt-1 break-keep text-[12px] font-semibold leading-5 text-[#6f655b]">
            {sourceLabel} · {sourceLicense}
          </p>
          <p className="mt-1 break-keep text-[11px] font-semibold leading-5 text-[#81766d]">
            {reviewedForBeginner
              ? "초보자용 계량과 실패 방지 문장은 집밥노트 기준으로 정리했습니다."
              : "원천 정보는 앱 표시 기준으로 정리하고, 초보자 문장은 별도 기준으로 보완합니다."}
          </p>
          {sourceUrl ? (
            <Link
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-[12px] font-black text-[#d94d19] underline-offset-2 hover:underline"
            >
              원천 페이지 확인
            </Link>
          ) : null}
        </div>
      </section>

      {hasRecipeVisualGuide ? (
        <section id="recipe-guide" className="scroll-mt-24 bg-white px-5 pt-5">
          <div className="rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] p-3">
            <div className="flex items-center gap-2 px-1 pb-3">
              <BookOpenText size={18} className="text-[#ef8a3a]" />
              <h2 className="text-[19px] font-black text-[#242424]">사진으로 보는 레시피</h2>
            </div>
            <p className="mb-3 break-keep px-1 text-[12px] font-bold leading-5 text-[#6f655b]">
              완성 사진은 가리지 않고 보여주고, 재료와 준비물은 아래 카드에서 따로 확인할 수 있게 정리했습니다.
            </p>
            <div className="space-y-3">
              <div className="overflow-hidden rounded-[14px] border border-[#ece8e2] bg-white">
                <RecipeImage
                  src={heroImage}
                  fallbackSrc={FALLBACK_IMAGE}
                  alt={`${recipe.name} 완성 사진`}
                  className="aspect-[4/3] overflow-hidden bg-[#fff8ef]"
                  imageClassName={`h-full w-full ${isGeneratedHeroImage ? "object-contain p-2" : "object-cover"}`}
                />
                {recipe.imageCaption ? (
                  <p className="break-keep px-3 py-2 text-[12px] font-bold leading-5 text-[#6f655b]">
                    {recipe.imageCaption}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <div className="rounded-[14px] border border-[#f0dfcb] bg-[#fff9f0] px-3 py-3">
                  <p className="text-[12px] font-black text-[#d94d19]">필수 재료</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {guideIngredientDetails.map((ingredient) => (
                      <div key={`guide-ingredient-${ingredient.name}-${ingredient.display}`} className="rounded-[10px] bg-white px-3 py-2">
                        <p className="break-keep text-[14px] font-black leading-5 text-[#2f2117]">{ingredient.name}</p>
                        <p className="mt-0.5 break-keep text-[12px] font-bold leading-5 text-[#7a6552]">{ingredient.display}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {guideToolItems.length > 0 ? (
                  <div className="rounded-[14px] border border-[#dcebd2] bg-[#f4fbef] px-3 py-3">
                    <p className="text-[12px] font-black text-[#4f8740]">준비물</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {guideToolItems.map((tool) => (
                        <span key={`guide-tool-${tool}`} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-black text-[#426e35]">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {guidePrepItems.length > 0 ? (
                  <div className="rounded-[14px] border border-[#ece8e2] bg-white px-3 py-3">
                    <p className="text-[12px] font-black text-[#2f2117]">시작 전 준비</p>
                    <ul className="mt-2 space-y-1.5">
                      {guidePrepItems.map((item) => (
                        <li key={`guide-prep-${item}`} className="break-keep rounded-[10px] bg-[#faf8f5] px-3 py-2 text-[12px] font-bold leading-5 text-[#6f655b]">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              {visualGuideSteps.length > 0 ? (
                <ol className="space-y-4">
                  {visualGuideSteps.map((step) => (
                    <li key={`visual-${step.index}`} className="overflow-hidden rounded-[12px] border border-[#ece8e2] bg-white">
                      <RecipeImage
                        src={step.imageUrl}
                        fallbackSrc={recipe.recipeGuideImageUrl || recipe.thumbnailUrl || FALLBACK_IMAGE}
                        alt={step.imageAlt || `${recipe.name} 조리 순서 ${step.index}`}
                        className="aspect-square overflow-hidden bg-[#eee7dd]"
                        imageClassName="h-full w-full object-cover"
                      />
                      <div className="px-3 py-3">
                        <p className="text-[12px] font-black text-[#ef8a3a]">
                          STEP {step.index}{step.title ? ` · ${step.title}` : ""}
                        </p>
                        <p className="mt-1 break-keep text-[16px] font-black leading-6 text-[#2f2117]">
                          {step.action || step.description}
                        </p>
                        {step.visualCue ? (
                          <p className="mt-2 break-keep rounded-[8px] bg-[#fff7ed] px-3 py-2 text-[12px] font-bold leading-5 text-[#6e431d]">
                            눈으로 확인: {step.visualCue}
                          </p>
                        ) : null}
                        {step.beginnerTip ? (
                          <p className="mt-2 break-keep rounded-[8px] bg-[#eef6df] px-3 py-2 text-[12px] font-bold leading-5 text-[#4f8740]">
                            초보 팁: {step.beginnerTip}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <>
                  {recipe.steps.length > 0 ? (
                    <ol className="mt-3 space-y-2">
                      {recipe.steps.slice(0, 5).map((step) => (
                        <li key={`visual-summary-${step.index}`} className="rounded-[10px] border border-[#ece8e2] bg-white px-3 py-3">
                          <p className="text-[12px] font-black text-[#ef8a3a]">
                            STEP {step.index}{step.title ? ` · ${step.title}` : ""}
                          </p>
                          <p className="mt-1 break-keep text-[14px] font-bold leading-6 text-[#2f2117]">
                            {step.action || step.description}
                          </p>
                          {step.visualCue ? (
                            <p className="mt-2 break-keep rounded-[8px] bg-[#fff7ed] px-3 py-2 text-[12px] font-bold leading-5 text-[#6e431d]">
                              눈으로 확인: {step.visualCue}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {recipe.beforeStart?.length ? (
        <section className="px-5 pt-5">
          <div className="jipbab-panel rounded-[16px] px-4 py-4">
            <h2 className="text-[17px] font-black text-[#2f2117]">시작 전 준비</h2>
            <ul className="mt-3 space-y-2">
              {recipe.beforeStart.map((item) => (
                <li key={item} className="rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[12px] font-bold leading-5 text-[#6e431d]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="ingredients" className="scroll-mt-24 bg-white px-5 py-8">
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#2d2d2d] pb-3">
          <h2 className="text-[27px] font-black tracking-normal text-[#242424]">{recipe.name} 재료</h2>
          <a
            href="#measurement"
            className="shrink-0 rounded-[8px] border border-[#dedbd6] bg-white px-3 py-2 text-[14px] font-bold text-[#3a3a3a]"
          >
            계량법안내
          </a>
        </div>
        {ingredientDetails.length === 0 ? (
          <p className="mt-4 rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-3 text-sm text-[#6f655b]">재료 정보가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-[#ededed]">
            {ingredientDetails.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.display}`} className="grid grid-cols-[minmax(0,1fr)_92px_64px] items-center gap-2 py-4 min-[390px]:grid-cols-[minmax(0,1fr)_104px_72px]">
                <div className="min-w-0">
                  <p className="break-keep text-[19px] font-medium leading-7 text-[#303030]">
                    {ingredient.name}
                  </p>
                {ingredient.beginnerNote || ingredient.prepNote || ingredient.substitute ? (
                  <div className="mt-1 space-y-0.5 text-[12px] font-semibold leading-5 text-[#7a7168]">
                    {ingredient.beginnerNote ? <p>{ingredient.beginnerNote}</p> : null}
                    {ingredient.prepNote ? <p>{ingredient.prepNote}</p> : null}
                    {ingredient.substitute ? <p>없으면: {ingredient.substitute}</p> : null}
                  </div>
                ) : null}
                </div>
                <span className="break-keep text-center text-[18px] font-medium leading-6 text-[#303030]">{ingredient.display}</span>
                <Link
                  href={`/shopping?recipe=${encodeURIComponent(recipe.id)}&ingredient=${encodeURIComponent(ingredient.name)}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#d8d6d2] px-3 text-[16px] font-medium text-[#303030]"
                >
                  구매
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RecipeShoppingAssistant
        recipeId={recipe.id}
        recipeName={recipe.name}
        ingredientList={recipe.ingredientList}
        ingredientDetails={ingredientDetails}
      />

      <section id="measurement" className="scroll-mt-24 bg-white px-5 py-7">
        <div className="rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <div className="flex items-center gap-2">
            <Ruler size={18} className="text-[#78a95f]" />
            <h2 className="text-[19px] font-black text-[#242424]">계량법안내</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {measurementTips.map((tip) => (
              <p key={tip} className="break-keep rounded-[8px] bg-white px-3 py-2 text-[14px] font-semibold leading-6 text-[#5d554d]">
                {tip}
              </p>
            ))}
          </div>
        </div>
      </section>

      <KnowHowRail recipeName={recipe.name} items={recipe.beforeStart?.length ? recipe.beforeStart : DEFAULT_KNOW_HOW_ITEMS.map((item) => item.detail)} />
      <VideoRecipePanel recipeName={recipe.name} />
      <RecipeInstructionView recipeName={recipe.name} steps={recipe.steps} />

      <section id="recipe-notes" className="scroll-mt-24 bg-white px-5 py-7">
        <div className="rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <div className="flex items-center gap-2">
            <NotebookText size={18} className="text-[#4c93df]" />
            <h2 className="text-[19px] font-black text-[#242424]">노트</h2>
          </div>
          <p className="mt-2 break-keep text-[14px] font-semibold leading-6 text-[#6f655b]">
            만든 뒤 바꾼 재료, 다음에 줄일 양, 가족 반응은 Q&A와 댓글에 남겨 다시 볼 수 있어요.
          </p>
        </div>
      </section>

      <RecipeCookMode recipeName={recipe.name} steps={recipe.steps} />

      <section className="bg-white px-5 pt-5">
        <div className="rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <h2 className="text-[21px] font-black text-[#242424]">망했어요</h2>
          <div className="mt-3 space-y-2 text-[13px] font-semibold leading-5">
            <p className="rounded-[8px] bg-white px-3 py-2 text-[#8a5a2a]">탔을 때: 탄 부분은 섞지 말고 위쪽만 덜어낸 뒤 물 2큰술을 더하세요.</p>
            <p className="rounded-[8px] bg-white px-3 py-2 text-[#8a5a2a]">짰을 때: 밥, 두부, 물 중 하나를 더해 간을 연하게 만드세요.</p>
            <p className="rounded-[8px] bg-white px-3 py-2 text-[#8a5a2a]">덜 익었을 때: 불을 약하게 줄이고 1분씩 추가로 익히며 가운데를 확인하세요.</p>
            <p className="rounded-[8px] bg-white px-3 py-2 text-[#8a5a2a]">질어졌을 때: 뚜껑을 열고 약불로 1분 더 두어 수분을 날리세요.</p>
            <p className="rounded-[8px] bg-white px-3 py-2 text-[#8a5a2a]">부서졌을 때: 모양을 포기하고 밥 위에 올려 덮밥이나 비빔밥처럼 먹어도 됩니다.</p>
            <p className="rounded-[8px] bg-[#eef6df] px-3 py-2 text-[#4f8740]">{recipe.fallbackMeal ?? "모양이 무너지면 밥 위에 올려 덮밥처럼 먹으면 됩니다."}</p>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 pt-5">
        <div className="rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <h2 className="text-[21px] font-black text-[#242424]">완성 확인</h2>
          <p className="mt-2 break-keep text-[15px] font-semibold leading-7 text-[#4b4540]">
            {recipe.successCheck ?? "가장 두꺼운 재료가 차갑지 않고, 한입 맛봤을 때 짠맛이 강하지 않으면 완성입니다."}
          </p>
        </div>
      </section>

      <section className="bg-white px-5 pt-5">
        <div className="grid gap-2 rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <h2 className="text-[21px] font-black text-[#242424]">남았을 때</h2>
          <p className="rounded-[8px] bg-white px-3 py-2 text-[13px] font-bold leading-6 text-[#5d554d]">
            보관: {recipe.storageTip ?? "한 김 식힌 뒤 밀폐 용기에 담아 냉장 보관하세요."}
          </p>
          <p className="rounded-[8px] bg-white px-3 py-2 text-[13px] font-bold leading-6 text-[#5d554d]">
            다시 데우기: {recipe.reheatTip ?? "물 1큰술을 더하고 가운데까지 따뜻해졌는지 확인하세요."}
          </p>
        </div>
      </section>

      <div id="recipe-qna" className="scroll-mt-24">
        <RecipeComments recipeId={recipe.id} recipeName={recipe.name} />
      </div>

      <section className="bg-white px-5 pb-24 pt-5">
        <div className="rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-4 py-4">
          <h2 className="text-[14px] font-black text-[#242424]">레시피 출처</h2>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#6f655b]">
            출처: {sourceLabel} · 라이선스/권한: {sourceLicense}
          </p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a7168]">
            제공자: {recipe.sourceProvider ?? "집밥노트"} · 콘텐츠 기준: {contentOriginLabel}
            {recipe.sourceExternalId ? ` · 원천 ID: ${recipe.sourceExternalId}` : ""}
          </p>
          {sourceUrl ? (
            <Link
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-[12px] font-black text-[#d94d19] underline-offset-2 hover:underline"
            >
              원천 페이지 확인
            </Link>
          ) : null}
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a7168]">
            {reviewedForBeginner
              ? "초보자용 계량, 실패 방지 팁, 조리 문장은 집밥노트 기준으로 검수했습니다."
              : "공공 API 원천 정보는 앱 표시 기준으로 정리하며, 초보자 문장은 원문을 그대로 복사하지 않습니다."}
          </p>
        </div>
      </section>

      <nav className="bg-white px-5 pb-4 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <a
            href="#instructions"
            className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-[#242424] px-3 text-[13px] font-black text-white"
          >
            <BookOpenText size={16} />
            순서 보기
          </a>
          <a
            href="#shopping-assistant"
            className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-[#78a95f] px-3 text-[13px] font-black text-white"
          >
            <ShoppingBasket size={16} />
            부족 재료 장보기
          </a>
        </div>
      </nav>
    </div>
  );
}

function DetailMetric({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-[8px] border border-[#ece8e2] bg-[#faf8f5] px-1.5 py-2">
      <span className="mx-auto flex h-5 w-5 items-center justify-center text-[#78a95f]">{icon}</span>
      <p className="mt-1 break-keep text-[11px] font-black leading-4 text-[#39342f]">{label}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  tone,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  tone: "orange" | "violet" | "mint" | "blue";
}) {
  const toneClass = {
    orange: "bg-[#f5f1ec] text-[#ef8a3a]",
    violet: "bg-[#f5f1ec] text-[#8d62df]",
    mint: "bg-[#f5f1ec] text-[#63b7a8]",
    blue: "bg-[#f5f1ec] text-[#4c93df]",
  }[tone];

  return (
    <a href={href} className="min-w-0 text-center">
      <span className={`mx-auto flex aspect-square w-full max-w-[86px] items-center justify-center rounded-[28px] ${toneClass}`}>
        {icon}
      </span>
      <span className="mt-2 block break-keep text-[15px] font-medium leading-5 text-[#303030]">{label}</span>
    </a>
  );
}

function KnowHowRail({ recipeName, items }: { recipeName: string; items: string[] }) {
  const cards = (items.length > 0 ? items : DEFAULT_KNOW_HOW_ITEMS.map((item) => item.detail)).slice(0, 6);

  return (
    <section className="border-y-[14px] border-[#f4f4f4] bg-white px-5 py-8">
      <h2 className="text-[27px] font-black tracking-normal text-[#242424]">노하우</h2>
      <div className="scrollbar-hide -mx-5 mt-5 flex gap-3 overflow-x-auto px-5 pb-4">
        {cards.map((item, index) => (
          <article key={`${item}-${index}`} className="w-[168px] shrink-0">
            <div className="flex aspect-[1.22] items-center justify-center rounded-[8px] bg-[#eee7dd] px-4 text-center">
              <span className="break-keep text-[15px] font-black leading-6 text-[#5b5148]">{recipeName}</span>
            </div>
            <h3 className="mt-3 break-keep text-[18px] font-medium leading-6 text-[#303030]">
              {DEFAULT_KNOW_HOW_ITEMS[index]?.title ?? "요리 팁"}
            </h3>
            <p className="mt-1 line-clamp-2 break-keep text-[12px] font-semibold leading-5 text-[#777]">{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function VideoRecipePanel({ recipeName }: { recipeName: string }) {
  const query = encodeURIComponent(`${recipeName} 레시피`);

  return (
    <section className="border-b-[14px] border-[#f4f4f4] bg-white px-5 py-8">
      <h2 className="text-[27px] font-black tracking-normal text-[#242424]">동영상 레시피</h2>
      <a
        href={`https://www.youtube.com/results?search_query=${query}`}
        target="_blank"
        rel="noreferrer"
        className="mt-5 block overflow-hidden rounded-[2px] bg-[#423a32] text-white"
      >
        <div className="relative aspect-video bg-[linear-gradient(135deg,#5d554d_0%,#242424_55%,#8a5a2a_100%)] px-5 py-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(255,255,255,0.18),transparent_34%)]" />
          <div className="relative z-10 max-w-[72%]">
            <p className="break-keep text-[22px] font-black leading-8">{recipeName}</p>
            <p className="mt-2 text-[13px] font-semibold text-white/72">외부 영상 검색으로 열기</p>
          </div>
          <span className="absolute left-1/2 top-1/2 z-10 flex h-16 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[16px] bg-[#f23a2f]">
            <Play size={34} fill="white" strokeWidth={0} />
          </span>
        </div>
      </a>
    </section>
  );
}
