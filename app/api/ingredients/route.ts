import { NextResponse } from "next/server";
import { getRateLimitKey } from "@/lib/request-security";
import type { IngredientCategory } from "@/types";
import catalogData from "@/lib/ingredients-catalog-data.json";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 80;
const MIN_LIMIT = 1;
const MAX_SEARCH_LENGTH = 40;
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 40;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const RATE_LIMIT_MAX_REQUESTS = IS_PRODUCTION ? MAX_REQUESTS_PER_WINDOW : 5000;
const SEARCH_PATTERN = /^[0-9A-Za-z가-힣\s\-_/().,&]+$/;

const CATEGORIES: IngredientCategory[] = [
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

const requestStore = new Map<string, { count: number; startedAt: number }>();

const toPositiveInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const isRateLimited = (key: string): boolean => {
  if (!IS_PRODUCTION) {
    return false;
  }

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

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  requestStore.set(key, { ...current, count: current.count + 1 });
  return false;
};

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

export async function GET(request: Request) {
  const clientKey = getRateLimitKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const category = parseCategory(searchParams.get("category"));
  const cursor = toPositiveInt(searchParams.get("cursor"), 0);
  const limit = Math.min(Math.max(toPositiveInt(searchParams.get("limit"), DEFAULT_LIMIT), MIN_LIMIT), MAX_LIMIT);

  let searchKeyword: string | null;
  try {
    searchKeyword = normalizeSearch(searchParams.get("q"));
  } catch {
    return NextResponse.json(
      { message: "검색어가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const byCategory = catalogData.byCategory as Record<IngredientCategory, string[]>;
  const baseItems = category ? (byCategory[category] || []) : catalogData.all;
  const filteredItems = searchKeyword
    ? baseItems.filter((item: string) => item.toLowerCase().includes(searchKeyword as string))
    : baseItems;

  const items = filteredItems.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < filteredItems.length ? cursor + limit : null;

  return NextResponse.json({
    items,
    total: filteredItems.length,
    nextCursor,
    builtAt: new Date(catalogData.builtAt).toISOString(),
    scannedFrom: catalogData.scannedFrom,
    message: catalogData.message,
  });
}
