// 이 파일은 레시피 상세 화면을 담당합니다 - 큰 이미지, 재료 목록, 조리 순서를 제공합니다.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import RecipeActionPanel from "@/components/recipe/RecipeActionPanel";
import { getBeginnerRecipeProfile } from "@/lib/beginner-recommendations";
import { getSampleRecipeDetail } from "@/lib/sample-recipes";
import type { RecipeDetailRecord, RecipeDetailStep } from "@/types";

const SERVICE_ID = "COOKRCP01";
const BASE_URL = "https://openapi.foodsafetykorea.go.kr/api";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1400&q=80";

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

const parseIngredientDisplayList = (rawIngredients: string): string[] => {
  if (!rawIngredients) {
    return [];
  }

  const parsed = rawIngredients
    .split(/[\n,;|/]+/g)
    .map((item) => item.replace(/^[-•·*]\s*/, "").trim())
    .filter((item) => item.length > 0);

  return Array.from(new Set(parsed));
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
    return Array.from(
      new Set(
        value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0),
      ),
    );
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
  const fromSample = getSampleRecipeDetail(recipeId);
  if (fromSample) {
    return fromSample;
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
  const beginnerProfile = getBeginnerRecipeProfile(recipe);

  return (
    <div className="pb-10">
      {/* 상단 히어로 이미지 */}
      <section className="relative h-72 w-full overflow-hidden">
        {/* Next Image 도메인 설정 전까지는 원본 URL 이미지를 그대로 사용합니다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt={recipe.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        <Link
          href="/recipe"
          className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-soft"
        >
          <ChevronLeft size={14} />
          목록
        </Link>

        <div className="absolute bottom-4 left-5 right-5">
          <span className="rounded-full bg-mint-200 px-2.5 py-1 text-[11px] font-bold text-mint-500">
            {recipe.category}
          </span>
          <h1 className="mt-2 text-2xl font-bold text-white">{recipe.name}</h1>
          <p className="mt-1 text-sm text-white/85">
            {recipe.method} · {recipe.calories} kcal
          </p>
        </div>
      </section>

      {/* 해시태그 */}
      {tags.length > 0 && (
        <section className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto px-5">
          {tags.map((tag) => (
            <span key={tag} className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
              {tag}
            </span>
          ))}
        </section>
      )}

      <section className="mt-4 px-5">
        <div className="rounded-3xl bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold tracking-[0.14em] text-mint-500">초보자 체크</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-mint-50 px-2 py-3 text-center">
              <p className="text-lg font-bold text-mint-500">{beginnerProfile.minutes}분</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500">예상 시간</p>
            </div>
            <div className="rounded-2xl bg-peach-50 px-2 py-3 text-center">
              <p className="text-sm font-bold text-peach-500">{beginnerProfile.difficultyLabel}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500">난이도</p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-2 py-3 text-center">
              <p className="text-lg font-bold text-gray-700">{beginnerProfile.ingredientCount}개</p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-500">주요 재료</p>
            </div>
          </div>
          <p className="mt-3 rounded-2xl bg-cream-100 px-3 py-2 text-sm font-semibold text-gray-600">
            {beginnerProfile.confidenceLabel}. 순서를 위에서부터 하나씩 따라가면 됩니다.
          </p>
        </div>
      </section>

      <RecipeActionPanel
        recipeId={recipe.id}
        recipeName={recipe.name}
        category={recipe.category}
        imageUrl={heroImage}
        ingredientList={recipe.ingredientList}
      />

      {/* 재료 목록 */}
      <section className="mt-5 px-5">
        <h2 className="text-lg font-bold text-gray-800">🧂 재료</h2>
        {recipe.ingredientList.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-400">재료 정보가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {recipe.ingredientList.map((ingredient) => (
              <li key={ingredient} className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-soft">
                {ingredient}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 조리 순서 */}
      <section className="mt-6 px-5">
        <h2 className="text-lg font-bold text-gray-800">👩‍🍳 조리 순서</h2>
        <ol className="mt-3 space-y-3">
          {recipe.steps.map((step) => (
            <li key={step.index} className="overflow-hidden rounded-3xl bg-white shadow-soft">
              <div className="flex items-start gap-3 px-4 py-4">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint-100 text-xs font-bold text-mint-500">
                  {step.index}
                </span>
                <p className="text-sm leading-relaxed text-gray-700">{step.description}</p>
              </div>
              {step.imageUrl && (
                <div className="h-44 w-full overflow-hidden border-t border-gray-50">
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
