// 이 파일은 레시피 상세 화면을 담당합니다 - 큰 이미지, 재료 목록, 조리 순서를 제공합니다.
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock3, Heart, ShoppingBasket, Star, Users } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import RecipeExploreLinks from "@/components/recipe/RecipeExploreLinks";
import RecipeCookMode from "@/components/recipe/RecipeCookMode";
import RecipeShoppingAssistant from "@/components/recipe/RecipeShoppingAssistant";
import type { RecipeDetailRecord, RecipeDetailStep } from "@/types";

const SERVICE_ID = "COOKRCP01";
const BASE_URL = "https://openapi.foodsafetykorea.go.kr/api";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1400&q=80";
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
  thumbnail_url: string | null;
  ingredients: unknown;
  steps: unknown;
  source: string | null;
};

const normalizeRecipeImageUrl = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }

  return trimmed;
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

const normalizeStepList = (value: unknown): RecipeDetailStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const steps = value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const rawDescription = record.description;
      const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
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
        description,
        imageUrl: normalizeRecipeImageUrl(imageUrl),
      } satisfies RecipeDetailStep;
    })
    .filter((item): item is RecipeDetailStep => item !== null)
    .map((item, idx) => ({
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
      .select("id,title,description,category,thumbnail_url,ingredients,steps,source")
      .eq("id", recipeId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as SupabaseRecipeRow;
    const parsedMeta = parseMethodAndCalories(row.description);
    const ingredientList = normalizeIngredientList(row.ingredients);
    const steps = normalizeStepList(row.steps);

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
      steps:
        steps.length > 0
          ? steps
          : [
              { index: 1, description: "재료를 깨끗하게 손질하고 필요한 양을 준비합니다.", imageUrl: null },
              { index: 2, description: "조리법에 맞춰 가열하고, 중간에 간을 맞춰가며 조리합니다.", imageUrl: null },
              { index: 3, description: "불을 끄고 플레이팅한 뒤, 기호에 맞게 마무리합니다.", imageUrl: null },
            ],
    };
  } catch (error) {
    console.error("Supabase 레시피 상세 조회 실패", error);
    return null;
  }
}

async function fetchRecipeDetail(recipeId: string): Promise<RecipeDetailRecord | null> {
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
  };
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
  const tags = parseHashTags(recipe.hashTag);
  const cookingMinutes = Math.min(Math.max(recipe.steps.length * 5 + 5, 15), 45);

  return (
    <div className="min-h-full bg-[#fbf6ee] pb-8">
      <section className="relative overflow-hidden bg-[#f8eddf] pb-4">
        <div className="mobile-safe-top absolute left-4 top-0 z-20">
          <Link
            href="/recipe"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fffaf3]/92 text-[#2f2117] shadow-soft"
            aria-label="레시피 목록으로 돌아가기"
          >
            <ChevronLeft size={18} />
          </Link>
        </div>
        <div className="mobile-safe-top absolute right-4 top-0 z-20 flex gap-2">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#fffaf3]/92 text-[#2f2117] shadow-soft" aria-label="레시피 좋아요">
            <Heart size={17} />
          </button>
        </div>

        <div className="relative h-[250px] w-full overflow-hidden">
          {/* Next Image 도메인 설정 전까지는 원본 URL 이미지를 그대로 사용합니다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt={recipe.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2f2117]/60 via-transparent to-transparent" />
        </div>

        <div className="-mt-7 px-5">
          <div className="jipbab-panel relative rounded-[20px] px-4 py-4">
            <span className="rounded-full border border-[#eadcc9] bg-[#fff7ed] px-3 py-1 text-[11px] font-black text-[#d94d19]">
              {recipe.category}
            </span>
            <h1 className="mt-2 text-[24px] font-black leading-tight text-[#2f2117]">{recipe.name}</h1>
            <p className="mt-1 text-[13px] font-semibold text-[#7d6d5f]">{recipe.method} · {recipe.calories} kcal</p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <DetailMetric icon={<Clock3 size={14} />} label={`${cookingMinutes}분`} />
              <DetailMetric icon={<Users size={14} />} label="2인분" />
              <DetailMetric icon={<Star size={14} />} label="쉬움" />
              <DetailMetric icon={<ShoppingBasket size={14} />} label={`${recipe.ingredientList.length}개`} />
            </div>
          </div>
        </div>
      </section>

      {tags.length > 0 && (
        <section className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pt-4">
          {tags.map((tag) => (
            <span key={tag} className="shrink-0 rounded-full border border-[#eadcc9] bg-[#fffaf3] px-3 py-1.5 text-xs font-bold text-[#7d6d5f]">
              {tag}
            </span>
          ))}
        </section>
      )}

      <section className="px-5 pt-5">
        <h2 className="text-[17px] font-black text-[#2f2117]">재료</h2>
        {recipe.ingredientList.length === 0 ? (
          <p className="mt-2 rounded-[16px] border border-[#eadcc9] bg-[#fffaf3] px-4 py-3 text-sm text-[#8f7f70]">재료 정보가 없습니다.</p>
        ) : (
          <ul className="jipbab-panel mt-2 divide-y divide-[#eadcc9] overflow-hidden rounded-[16px]">
            {recipe.ingredientList.map((ingredient) => (
              <li key={ingredient} className="flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-[#4b3929]">
                <span>{ingredient}</span>
                <span className="text-[#a69585]">적당량</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RecipeShoppingAssistant recipeId={recipe.id} recipeName={recipe.name} ingredientList={recipe.ingredientList} />
      <RecipeExploreLinks recipeName={recipe.name} />
      <RecipeCookMode recipeName={recipe.name} steps={recipe.steps} />

      <section className="px-5 pt-5">
        <h2 className="text-[17px] font-black text-[#2f2117]">만드는 순서</h2>
        <ol className="mt-3 space-y-2.5">
          {recipe.steps.map((step) => (
            <li key={step.index} className="jipbab-panel overflow-hidden rounded-[16px]">
              <div className="flex items-start gap-3 px-4 py-4">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6e431d] text-xs font-black text-white">
                  {step.index}
                </span>
                <p className="text-sm leading-relaxed text-[#4b3929]">{step.description}</p>
              </div>
              {step.imageUrl && (
                <div className="h-44 w-full overflow-hidden border-t border-[#eadcc9]">
                  {/* Next Image 도메인 설정 전까지는 원본 URL 이미지를 그대로 사용합니다. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.imageUrl} alt={`${recipe.name} 조리 순서 ${step.index}`} className="h-full w-full object-cover" />
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function DetailMetric({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-[12px] border border-[#eadcc9] bg-[#fffaf3] px-2 py-2">
      <span className="mx-auto flex h-5 w-5 items-center justify-center text-[#8a5a2a]">{icon}</span>
      <p className="mt-1 text-[11px] font-black text-[#4b3929]">{label}</p>
    </div>
  );
}
