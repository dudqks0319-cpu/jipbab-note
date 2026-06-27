import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractRecipeIngredients } from "../lib/matching.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ID = "COOKRCP01";
const BASE_URL = "https://openapi.foodsafetykorea.go.kr/api";
const FETCH_TIMEOUT_MS = 4500;
const FETCH_RETRY_COUNT = 2;
const FETCH_RETRY_DELAY_MS = 250;
const RECIPES_PER_REQUEST = 200;
const MAX_SCAN_RECIPES = 1200;

const CATEGORIES = [
  "채소",
  "과일",
  "육류",
  "수산물",
  "유제품",
  "냉동식품",
  "조미료",
  "곡물/면/빵",
  "통조림/가공식품",
  "음료/기타",
];

const CATEGORY_PRIORITY = [
  "조미료",
  "육류",
  "수산물",
  "유제품",
  "채소",
  "과일",
  "냉동식품",
  "곡물/면/빵",
  "통조림/가공식품",
  "음료/기타",
];

const LOCAL_FALLBACK_BY_CATEGORY = {
  채소: ["양파", "대파", "마늘", "감자", "당근", "애호박", "버섯", "오이", "시금치", "브로콜리"],
  과일: ["사과", "배", "바나나", "딸기", "레몬", "오렌지", "키위", "블루베리"],
  육류: ["소고기", "돼지고기", "닭고기", "목살", "삼겹살", "닭가슴살", "소시지"],
  수산물: ["고등어", "연어", "새우", "오징어", "멸치", "미역", "다시마", "바지락"],
  유제품: ["우유", "치즈", "버터", "요거트", "생크림", "계란", "두부"],
  냉동식품: ["냉동만두", "냉동새우", "냉동볶음밥", "냉동우동면", "냉동블루베리"],
  조미료: ["간장", "고추장", "된장", "소금", "설탕", "식초", "참기름", "고춧가루"],
  "곡물/면/빵": ["쌀", "밀가루", "당면", "파스타면", "식빵", "라면"],
  "통조림/가공식품": ["참치캔", "옥수수캔", "김치", "스팸", "토마토소스"],
  "음료/기타": ["견과류", "생수", "탄산수", "오렌지주스", "티백"],
};

const CATEGORY_RULES = {
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
  냉동식품: [],
  조미료: [
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
  "곡물/면/빵": [
    { keyword: "쌀", weight: 5 },
    { keyword: "밀가루", weight: 5 },
    { keyword: "국수", weight: 4 },
    { keyword: "라면", weight: 4 },
    { keyword: "파스타", weight: 4 },
    { keyword: "식빵", weight: 4 },
    { keyword: "떡", weight: 4 },
    { keyword: "당면", weight: 4 },
  ],
  "통조림/가공식품": [
    { keyword: "통조림", weight: 5 },
    { keyword: "참치캔", weight: 5 },
    { keyword: "옥수수캔", weight: 5 },
    { keyword: "스팸", weight: 5 },
    { keyword: "김치", weight: 4 },
    { keyword: "잼", weight: 4 },
    { keyword: "토마토소스", weight: 4 },
  ],
  "음료/기타": [],
};

const CATEGORY_ALIASES = [
  [/다진\s*마늘/g, "다진마늘"],
  [/(청양|홍)\s*고추/g, "고추"],
  [/(진|국|양조)\s*간장/g, "간장"],
  [/케찹/g, "케첩"],
  [/달걀/g, "계란"],
  [/(엑스트라버진|버진)\s*올리브\s*오일/g, "올리브오일"],
  [/(카놀라|포도씨|해바라기)\s*유/g, "식용유"],
];

const BRACKET_PATTERN = /\([^)]*\)|\[[^\]]*]|\{[^}]*}/g;
const NON_WORD_PATTERN = /[^0-9a-zA-Z가-힣\s]/g;
const DESCRIPTOR_PATTERN =
  /(국산|수입|신선한|손질|슬라이스|채썬|깍둑|삶은|데친|볶은|건조|냉동|통조림|해동|무염|저염|유기농|말린|생)\s*/g;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeIngredientForCategory = (ingredientName) => {
  let normalized = ingredientName.toLowerCase().replace(BRACKET_PATTERN, " ");

  for (const [pattern, replacement] of CATEGORY_ALIASES) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized.replace(DESCRIPTOR_PATTERN, " ").replace(NON_WORD_PATTERN, " ").replace(/\s+/g, " ").trim();

  return normalized;
};

const getRuleScore = (normalizedIngredient, rule) => {
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

const classifyIngredientCategory = (ingredientName) => {
  const normalized = normalizeIngredientForCategory(ingredientName);
  if (!normalized) {
    return "음료/기타";
  }

  if (/(액젓|소스|드레싱|시럽|오일|식용유)/.test(normalized)) {
    return "조미료";
  }

  let bestCategory = "음료/기타";
  let bestScore = 0;

  for (const category of CATEGORIES) {
    if (category === "음료/기타") {
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

const sortIngredients = (items) => {
  return [...items].sort((left, right) => left.localeCompare(right, "ko"));
};

const resolveMfdsServicePayload = (payload) => {
  const service = payload.COOKRCP01;
  if (!service) {
    return null;
  }

  if (Array.isArray(service)) {
    return service.find((item) => Array.isArray(item.row)) ?? service[0] ?? null;
  }

  return service;
};

const parseTotalCount = (value) => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
};

const fetchRecipeChunk = async (apiKey, start, end) => {
  const endpoint = `${BASE_URL}/${apiKey}/${SERVICE_ID}/json/${start}/${end}`;

  for (let attempt = 0; attempt <= FETCH_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const canRetry = attempt < FETCH_RETRY_COUNT && (response.status === 429 || response.status >= 500);
        if (canRetry) {
          await sleep(FETCH_RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(`식약처 API 호출 실패 (${response.status})`);
      }

      const payload = await response.json();
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

const buildCatalog = async (apiKey) => {
  const allSet = new Set();
  const setByCategory = {
    채소: new Set(),
    과일: new Set(),
    육류: new Set(),
    수산물: new Set(),
    유제품: new Set(),
    냉동식품: new Set(),
    조미료: new Set(),
    "곡물/면/빵": new Set(),
    "통조림/가공식품": new Set(),
    "음료/기타": new Set(),
  };

  const maxPages = Math.ceil(MAX_SCAN_RECIPES / RECIPES_PER_REQUEST);
  let scannedRecipes = 0;
  let maxTargetRecipes = MAX_SCAN_RECIPES;

  for (let page = 1; page <= maxPages && scannedRecipes < maxTargetRecipes; page += 1) {
    const start = (page - 1) * RECIPES_PER_REQUEST + 1;
    const end = start + RECIPES_PER_REQUEST - 1;
    console.log(`식약처 레시피 가져오는 중: ${start} ~ ${end}...`);
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
    냉동식품: sortIngredients(Array.from(setByCategory.냉동식품)),
    조미료: sortIngredients(Array.from(setByCategory.조미료)),
    "곡물/면/빵": sortIngredients(Array.from(setByCategory["곡물/면/빵"])),
    "통조림/가공식품": sortIngredients(Array.from(setByCategory["통조림/가공식품"])),
    "음료/기타": sortIngredients(Array.from(setByCategory["음료/기타"])),
  };

  return {
    builtAt: Date.now(),
    scannedRecipes,
    all: sortIngredients(Array.from(allSet)),
    byCategory,
  };
};

const getFallbackCatalog = () => {
  const builtAt = Date.now();
  const all = Array.from(
    new Set(
      CATEGORIES.flatMap((category) => LOCAL_FALLBACK_BY_CATEGORY[category]).filter((item) => item.trim().length > 0),
    ),
  );

  return {
    builtAt,
    scannedRecipes: 0,
    all,
    byCategory: LOCAL_FALLBACK_BY_CATEGORY,
  };
};

// Main execution
async function main() {
  console.log("재료 카탈로그 정적 빌드 시작...");

  let apiKey = process.env.MFDS_API_KEY || process.env.FOODSAFETY_API_KEY;

  // Read .env.local manually if not in process.env
  try {
    const envPath = path.join(__dirname, "../.env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const match = envContent.match(/(?:MFDS_API_KEY|FOODSAFETY_API_KEY)\s*=\s*(.*)/);
      if (match && match[1].trim()) {
        apiKey = match[1].trim();
      }
    }
  } catch {
    console.warn(".env.local 읽기 실패, process.env 기반으로 진행합니다.");
  }

  let catalog;
  let scannedFrom = "local_fallback";

  if (apiKey) {
    try {
      catalog = await buildCatalog(apiKey);
      scannedFrom = "mfds_recipes";
      console.log(`식약처 API로부터 카탈로그 빌드 완료. 스캔된 레시피 수: ${catalog.scannedRecipes}`);
    } catch (error) {
      console.error("식약처 API로 빌드 중 오류 발생, fallback 카탈로그로 전환합니다:", error);
      catalog = getFallbackCatalog();
    }
  } else {
    console.log("식약처 API 키가 설정되지 않아 로컬 기본 추천 데이터로 빌드합니다.");
    catalog = getFallbackCatalog();
  }

  const result = {
    ...catalog,
    scannedFrom,
    message: apiKey ? undefined : "API 키가 없어 기본 추천 목록으로 빌드되었습니다.",
  };

  const outputPath = path.join(__dirname, "../lib/ingredients-catalog-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`카탈로그 파일이 성공적으로 저장되었습니다: ${outputPath}`);
}

main().catch((err) => {
  console.error("카탈로그 빌드 중 에러 발생:", err);
  process.exit(1);
});
