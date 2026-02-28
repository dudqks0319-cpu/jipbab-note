// 이 파일은 식약처 레시피 데이터에서 재료명을 추출해 카테고리별 추천 목록 API를 제공합니다.
import { NextResponse } from "next/server";

import { extractRecipeIngredients } from "@/lib/matching";
import type { IngredientCategory } from "@/types";

const SERVICE_ID = "COOKRCP01";
const BASE_URL = "https://openapi.foodsafetykorea.go.kr/api";
const CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_REVALIDATE_SECONDS = 30 * 60;
const FETCH_TIMEOUT_MS = 4500;
const FETCH_RETRY_COUNT = 2;
const FETCH_RETRY_DELAY_MS = 250;
const RECIPES_PER_REQUEST = 200;
const MAX_SCAN_RECIPES = 1200;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 80;
const MIN_LIMIT = 1;
const MAX_SEARCH_LENGTH = 40;
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 40;

type MfdsRecipeRow = {
  RCP_PARTS_DTLS?: string;
};

type MfdsResult = {
  CODE?: string;
  MSG?: string;
};

type MfdsServiceResponse = {
  row?: MfdsRecipeRow[];
  total_count?: string;
  RESULT?: MfdsResult;
};

type MfdsResponse = {
  COOKRCP01?: MfdsServiceResponse | MfdsServiceResponse[];
  RESULT?: MfdsResult;
};

type MfdsRecipeChunk = {
  rows: MfdsRecipeRow[];
  totalCount: number | null;
};

type CategoryRule = {
  keyword: string;
  weight: number;
  exactOnly?: boolean;
};

type IngredientCatalog = {
  builtAt: number;
  scannedRecipes: number;
  all: string[];
  byCategory: Record<IngredientCategory, string[]>;
};

let catalogCache: IngredientCatalog | null = null;
let catalogBuildPromise: Promise<IngredientCatalog> | null = null;
const requestStore = new Map<string, { count: number; startedAt: number }>();

const CATEGORIES: IngredientCategory[] = ["채소", "과일", "육류", "수산물", "유제품", "양념", "기타"];
const CATEGORY_PRIORITY: IngredientCategory[] = ["양념", "육류", "수산물", "유제품", "채소", "과일", "기타"];
const SEARCH_PATTERN = /^[0-9A-Za-z가-힣\s\-_/().,&]+$/;
const BRACKET_PATTERN = /\([^)]*\)|\[[^\]]*]|\{[^}]*}/g;
const NON_WORD_PATTERN = /[^0-9a-zA-Z가-힣\s]/g;
const DESCRIPTOR_PATTERN =
  /(국산|수입|신선한|손질|슬라이스|채썬|깍둑|삶은|데친|볶은|건조|냉동|통조림|해동|무염|저염|유기농|말린|생)\s*/g;

const CATEGORY_RULES: Record<IngredientCategory, CategoryRule[]> = {
  채소: [
    { keyword: "양파", weight: 4 },
    { keyword: "대파", weight: 4 },
    { keyword: "파", weight: 4, exactOnly: true },
    { keyword: "감자", weight: 4 },
    { keyword: "고구마", weight: 4 },
    { keyword: "당근", weight: 4 },
    { keyword: "오이", weight: 4 },
    { keyword: "호박", weight: 4 },
    { keyword: "애호박", weight: 4 },
    { keyword: "단호박", weight: 4 },
    { keyword: "브로콜리", weight: 4 },
    { keyword: "버섯", weight: 4 },
    { keyword: "시금치", weight: 4 },
    { keyword: "배추", weight: 4 },
    { keyword: "무", weight: 3, exactOnly: true },
    { keyword: "상추", weight: 4 },
    { keyword: "깻잎", weight: 4 },
    { keyword: "고추", weight: 4 },
    { keyword: "콩나물", weight: 4 },
    { keyword: "양배추", weight: 4 },
    { keyword: "가지", weight: 4 },
    { keyword: "부추", weight: 4 },
    { keyword: "마늘", weight: 3 },
    { keyword: "토란", weight: 4 },
    { keyword: "샐러리", weight: 4 },
    { keyword: "케일", weight: 4 },
    { keyword: "파프리카", weight: 4 },
    { keyword: "토마토", weight: 4 },
    { keyword: "청경채", weight: 4 },
  ],
  과일: [
    { keyword: "사과", weight: 4 },
    { keyword: "배", weight: 4, exactOnly: true },
    { keyword: "포도", weight: 4 },
    { keyword: "딸기", weight: 4 },
    { keyword: "바나나", weight: 4 },
    { keyword: "오렌지", weight: 4 },
    { keyword: "귤", weight: 4 },
    { keyword: "레몬", weight: 4 },
    { keyword: "키위", weight: 4 },
    { keyword: "복숭아", weight: 4 },
    { keyword: "망고", weight: 4 },
    { keyword: "자몽", weight: 4 },
    { keyword: "체리", weight: 4 },
    { keyword: "파인애플", weight: 4 },
    { keyword: "블루베리", weight: 4 },
    { keyword: "아보카도", weight: 3 },
  ],
  육류: [
    { keyword: "소고기", weight: 5 },
    { keyword: "돼지고기", weight: 5 },
    { keyword: "닭고기", weight: 5 },
    { keyword: "오리고기", weight: 5 },
    { keyword: "양고기", weight: 5 },
    { keyword: "목살", weight: 4 },
    { keyword: "삼겹살", weight: 4 },
    { keyword: "갈비", weight: 4 },
    { keyword: "베이컨", weight: 4 },
    { keyword: "햄", weight: 4 },
    { keyword: "다짐육", weight: 4 },
    { keyword: "불고기", weight: 4 },
    { keyword: "차돌", weight: 4 },
    { keyword: "소시지", weight: 4 },
    { keyword: "닭가슴살", weight: 4 },
    { keyword: "우삼겹", weight: 4 },
  ],
  수산물: [
    { keyword: "고등어", weight: 5 },
    { keyword: "연어", weight: 5 },
    { keyword: "참치", weight: 4 },
    { keyword: "오징어", weight: 5 },
    { keyword: "문어", weight: 5 },
    { keyword: "새우", weight: 5 },
    { keyword: "조개", weight: 5 },
    { keyword: "굴", weight: 4, exactOnly: true },
    { keyword: "멸치", weight: 5 },
    { keyword: "게", weight: 4, exactOnly: true },
    { keyword: "미역", weight: 5 },
    { keyword: "김", weight: 4, exactOnly: true },
    { keyword: "다시마", weight: 5 },
    { keyword: "어묵", weight: 4 },
    { keyword: "전복", weight: 5 },
    { keyword: "바지락", weight: 5 },
    { keyword: "낙지", weight: 5 },
    { keyword: "꽁치", weight: 5 },
  ],
  유제품: [
    { keyword: "우유", weight: 5 },
    { keyword: "치즈", weight: 5 },
    { keyword: "버터", weight: 5 },
    { keyword: "요거트", weight: 5 },
    { keyword: "요구르트", weight: 5 },
    { keyword: "생크림", weight: 5 },
    { keyword: "연유", weight: 5 },
    { keyword: "계란", weight: 4 },
    { keyword: "달걀", weight: 4 },
    { keyword: "두유", weight: 3 },
    { keyword: "두부", weight: 3 },
    { keyword: "크림치즈", weight: 5 },
    { keyword: "모짜렐라", weight: 5 },
    { keyword: "파마산", weight: 5 },
  ],
  양념: [
    { keyword: "간장", weight: 6 },
    { keyword: "고추장", weight: 6 },
    { keyword: "된장", weight: 6 },
    { keyword: "쌈장", weight: 6 },
    { keyword: "소금", weight: 5 },
    { keyword: "설탕", weight: 5 },
    { keyword: "식초", weight: 5 },
    { keyword: "참기름", weight: 6 },
    { keyword: "들기름", weight: 6 },
    { keyword: "후추", weight: 5 },
    { keyword: "고춧가루", weight: 6 },
    { keyword: "다진마늘", weight: 6 },
    { keyword: "케첩", weight: 6 },
    { keyword: "마요네즈", weight: 6 },
    { keyword: "올리고당", weight: 6 },
    { keyword: "물엿", weight: 6 },
    { keyword: "액젓", weight: 6 },
    { keyword: "굴소스", weight: 6 },
    { keyword: "식용유", weight: 6 },
    { keyword: "올리브오일", weight: 6 },
    { keyword: "카레가루", weight: 6 },
    { keyword: "소스", weight: 4 },
  ],
  기타: [],
};

const CATEGORY_ALIASES: Array<[RegExp, string]> = [
  [/다진\s*마늘/g, "다진마늘"],
  [/(청양|홍)\s*고추/g, "고추"],
  [/(진|국|양조)\s*간장/g, "간장"],
  [/케찹/g, "케첩"],
  [/달걀/g, "계란"],
  [/(엑스트라버진|버진)\s*올리브\s*오일/g, "올리브오일"],
  [/(카놀라|포도씨|해바라기)\s*유/g, "식용유"],
];

const toPositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
};

const isRateLimited = (key: string): boolean => {
  const now = Date.now();

  for (const [bucketKey, value] of requestStore.entries()) {
    if (now - value.startedAt > REQUEST_WINDOW_MS) {
      requestStore.delete(bucketKey);
    }
  }

  const current = requestStore.get(key);
  if (!current || now - current.startedAt > REQUEST_WINDOW_MS) {
    requestStore.set(key, { count: 1, startedAt: now });
    return false;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  requestStore.set(key, { ...current, count: current.count + 1 });
  return false;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const normalizeSearch = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_SEARCH_LENGTH) {
    throw new Error(`검색어는 ${MAX_SEARCH_LENGTH}자 이하로 입력해 주세요.`);
  }
  if (!SEARCH_PATTERN.test(trimmed)) {
    throw new Error("검색어에 사용할 수 없는 문자가 포함되어 있습니다.");
  }
  return trimmed.toLowerCase();
};

const parseCategory = (value: string | null): IngredientCategory | null => {
  if (!value || value === "전체") return null;
  return CATEGORIES.includes(value as IngredientCategory) ? (value as IngredientCategory) : null;
};

const normalizeIngredientForCategory = (ingredientName: string): string => {
  let normalized = ingredientName.toLowerCase().replace(BRACKET_PATTERN, " ");

  for (const [pattern, replacement] of CATEGORY_ALIASES) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized.replace(DESCRIPTOR_PATTERN, " ").replace(NON_WORD_PATTERN, " ").replace(/\s+/g, " ").trim();

  return normalized;
};

const getRuleScore = (normalizedIngredient: string, rule: CategoryRule): number => {
  if (!normalizedIngredient || !rule.keyword) {
    return 0;
  }

  if (rule.exactOnly) {
    return normalizedIngredient === rule.keyword ? rule.weight + 2 : 0;
  }

  if (normalizedIngredient === rule.keyword) {
    return rule.weight + 3;
  }

  if (
    normalizedIngredient.startsWith(`${rule.keyword} `) ||
    normalizedIngredient.endsWith(` ${rule.keyword}`) ||
    normalizedIngredient.includes(` ${rule.keyword} `)
  ) {
    return rule.weight + 1;
  }

  return normalizedIngredient.includes(rule.keyword) ? rule.weight : 0;
};

const classifyIngredientCategory = (ingredientName: string): IngredientCategory => {
  const normalized = normalizeIngredientForCategory(ingredientName);
  if (!normalized) {
    return "기타";
  }

  // 소스/액젓/오일류는 단백질 키워드가 있어도 양념으로 우선 분류합니다.
  if (/(액젓|소스|드레싱|시럽|오일|식용유)/.test(normalized)) {
    return "양념";
  }

  let bestCategory: IngredientCategory = "기타";
  let bestScore = 0;

  for (const category of CATEGORIES) {
    if (category === "기타") {
      continue;
    }

    const score = CATEGORY_RULES[category].reduce((sum, rule) => sum + getRuleScore(normalized, rule), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      continue;
    }

    if (score === bestScore && score > 0) {
      const currentPriority = CATEGORY_PRIORITY.indexOf(category);
      const bestPriority = CATEGORY_PRIORITY.indexOf(bestCategory);
      if (currentPriority !== -1 && bestPriority !== -1 && currentPriority < bestPriority) {
        bestCategory = category;
      }
    }
  }

  return bestCategory;
};

const sortIngredients = (items: string[]): string[] => {
  return [...items].sort((left, right) => left.localeCompare(right, "ko"));
};

const resolveMfdsServicePayload = (payload: MfdsResponse): MfdsServiceResponse | null => {
  const service = payload.COOKRCP01;
  if (!service) {
    return null;
  }

  if (Array.isArray(service)) {
    return service.find((item) => Array.isArray(item.row)) ?? service[0] ?? null;
  }

  return service;
};

const parseTotalCount = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
};

const fetchRecipeChunk = async (apiKey: string, start: number, end: number): Promise<MfdsRecipeChunk> => {
  const endpoint = `${BASE_URL}/${apiKey}/${SERVICE_ID}/json/${start}/${end}`;

  for (let attempt = 0; attempt <= FETCH_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        next: { revalidate: FETCH_REVALIDATE_SECONDS },
      });

      if (!response.ok) {
        const canRetry = attempt < FETCH_RETRY_COUNT && (response.status === 429 || response.status >= 500);
        if (canRetry) {
          await sleep(FETCH_RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(`식약처 API 호출 실패 (${response.status})`);
      }

      const payload = (await response.json()) as MfdsResponse;
      const service = resolveMfdsServicePayload(payload);
      const resultCode = service?.RESULT?.CODE ?? payload.RESULT?.CODE;
      if (resultCode && resultCode !== "INFO-000") {
        throw new Error(`식약처 API 오류 (${resultCode})`);
      }

      return {
        rows: Array.isArray(service?.row) ? service.row : [],
        totalCount: parseTotalCount(service?.total_count),
      };
    } catch (error) {
      const isAbortError = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof TypeError;
      const canRetry = attempt < FETCH_RETRY_COUNT && (isAbortError || isNetworkError);
      if (!canRetry) {
        throw error;
      }
      await sleep(FETCH_RETRY_DELAY_MS * (attempt + 1));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("식약처 API 호출 재시도에 실패했습니다.");
};

const buildCatalog = async (apiKey: string): Promise<IngredientCatalog> => {
  const allSet = new Set<string>();
  const setByCategory: Record<IngredientCategory, Set<string>> = {
    채소: new Set<string>(),
    과일: new Set<string>(),
    육류: new Set<string>(),
    수산물: new Set<string>(),
    유제품: new Set<string>(),
    양념: new Set<string>(),
    기타: new Set<string>(),
  };

  const maxPages = Math.ceil(MAX_SCAN_RECIPES / RECIPES_PER_REQUEST);
  let scannedRecipes = 0;
  let maxTargetRecipes = MAX_SCAN_RECIPES;

  for (let page = 1; page <= maxPages && scannedRecipes < maxTargetRecipes; page += 1) {
    const start = (page - 1) * RECIPES_PER_REQUEST + 1;
    const end = start + RECIPES_PER_REQUEST - 1;
    const { rows, totalCount } = await fetchRecipeChunk(apiKey, start, end);

    if (typeof totalCount === "number") {
      maxTargetRecipes = Math.min(MAX_SCAN_RECIPES, totalCount);
    }

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const ingredients = extractRecipeIngredients(row.RCP_PARTS_DTLS ?? "");
      for (const ingredient of ingredients) {
        if (ingredient.length < 2 || ingredient.length > 24) {
          continue;
        }

        allSet.add(ingredient);
        const category = classifyIngredientCategory(ingredient);
        setByCategory[category].add(ingredient);
      }
    }

    scannedRecipes += rows.length;

    if (rows.length < RECIPES_PER_REQUEST) {
      break;
    }
  }

  const byCategory = {
    채소: sortIngredients(Array.from(setByCategory.채소)),
    과일: sortIngredients(Array.from(setByCategory.과일)),
    육류: sortIngredients(Array.from(setByCategory.육류)),
    수산물: sortIngredients(Array.from(setByCategory.수산물)),
    유제품: sortIngredients(Array.from(setByCategory.유제품)),
    양념: sortIngredients(Array.from(setByCategory.양념)),
    기타: sortIngredients(Array.from(setByCategory.기타)),
  } satisfies Record<IngredientCategory, string[]>;

  return {
    builtAt: Date.now(),
    scannedRecipes,
    all: sortIngredients(Array.from(allSet)),
    byCategory,
  };
};

const refreshCatalog = async (apiKey: string): Promise<IngredientCatalog> => {
  if (!catalogBuildPromise) {
    catalogBuildPromise = buildCatalog(apiKey)
      .then((nextCatalog) => {
        catalogCache = nextCatalog;
        return nextCatalog;
      })
      .catch((error) => {
        if (catalogCache) {
          console.error("재료 추천 카탈로그 갱신 실패 - 기존 캐시 유지", error);
          return catalogCache;
        }
        throw error;
      })
      .finally(() => {
        catalogBuildPromise = null;
      });
  }

  return catalogBuildPromise;
};

const getCatalog = async (apiKey: string): Promise<IngredientCatalog> => {
  const now = Date.now();
  if (catalogCache && now - catalogCache.builtAt < CACHE_TTL_MS) {
    return catalogCache;
  }

  if (catalogCache) {
    void refreshCatalog(apiKey);
    return catalogCache;
  }

  return refreshCatalog(apiKey);
};

export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  const apiKey = process.env.MFDS_API_KEY || process.env.FOODSAFETY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "MFDS_API_KEY(또는 FOODSAFETY_API_KEY)가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const category = parseCategory(searchParams.get("category"));
  const cursor = toPositiveInt(searchParams.get("cursor"), 0);
  const limit = Math.min(Math.max(toPositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MIN_LIMIT), MAX_LIMIT);

  let searchKeyword: string | null;
  try {
    searchKeyword = normalizeSearch(searchParams.get("q"));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "검색어가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const catalog = await getCatalog(apiKey);
    const baseItems = category ? catalog.byCategory[category] : catalog.all;
    const filteredItems = searchKeyword
      ? baseItems.filter((item) => item.toLowerCase().includes(searchKeyword as string))
      : baseItems;

    const items = filteredItems.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < filteredItems.length ? cursor + limit : null;

    return NextResponse.json({
      items,
      total: filteredItems.length,
      nextCursor,
      builtAt: new Date(catalog.builtAt).toISOString(),
      scannedFrom: "mfds_recipes",
    });
  } catch (error) {
    console.error("재료 추천 API 오류", error);
    return NextResponse.json(
      { message: "재료 추천 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
