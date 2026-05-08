// 이 파일은 여러 줄 재료 입력을 냉장고 저장 payload로 바꾸는 파서입니다.
import { normalizeIngredientInput, suggestIngredientCategory } from "./ingredient-category.ts";
import type { IngredientCategory, IngredientFormPayload, IngredientStorageType } from "../types/index.ts";

const ENTRY_SPLIT_PATTERN = /[\n,;]+/g;
const QUANTITY_PATTERN =
  /^(.+?)\s+((?:\d+(?:\.\d+)?|반|한)\s*(?:kg|g|mg|ml|l|개|모|팩|봉|봉지|단|통|포기|알|장|캔|병|컵|큰술|작은술)|\d+(?:\.\d+)?(?:kg|g|mg|ml|l))$/i;
const MAX_BULK_ITEMS = 30;

export type BulkIngredientParseResult = {
  payloads: IngredientFormPayload[];
  skippedLines: string[];
};

function normalizeIngredientKey(name: string): string {
  return normalizeIngredientInput(name).toLowerCase().replace(/\s+/g, "");
}

function normalizeQuantity(rawQuantity: string): string {
  return rawQuantity
    .replace(/\s+/g, "")
    .replace(/봉지$/, "봉")
    .replace(/^한(?=단|봉|팩|통|포기|개|모)/, "1")
    .replace(/^반(?=통|포기|모|개)/, "반");
}

function inferStorageType(category: IngredientCategory): IngredientStorageType {
  if (category === "냉동식품") return "냉동";
  if (category === "조미료" || category === "곡물/면/빵" || category === "통조림/가공식품") {
    return "실온";
  }
  return "냉장";
}

export function parseBulkIngredientInput(
  rawInput: string,
  options: { fallbackCategory?: IngredientCategory; maxItems?: number } = {},
): BulkIngredientParseResult {
  const fallbackCategory = options.fallbackCategory ?? "채소";
  const maxItems = options.maxItems ?? MAX_BULK_ITEMS;
  const seenKeys = new Set<string>();
  const payloads: IngredientFormPayload[] = [];
  const skippedLines: string[] = [];

  for (const rawLine of rawInput.split(ENTRY_SPLIT_PATTERN)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (payloads.length >= maxItems) {
      skippedLines.push(line);
      continue;
    }

    const match = line.match(QUANTITY_PATTERN);
    const rawName = match?.[1] ?? line;
    const name = normalizeIngredientInput(rawName);
    const quantity = match?.[2] ? normalizeQuantity(match[2]) : null;
    const key = normalizeIngredientKey(name);

    if (!name || seenKeys.has(key)) {
      skippedLines.push(line);
      continue;
    }

    seenKeys.add(key);
    const category = suggestIngredientCategory(name, fallbackCategory);
    payloads.push({
      name,
      category,
      storageType: inferStorageType(category),
      quantity,
      expiryDate: null,
      memo: "유통기한 나중에 확인",
    });
  }

  return { payloads, skippedLines };
}
