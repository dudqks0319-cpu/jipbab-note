import { Buffer } from "node:buffer";

import { isUuidLike } from "./request-security.ts";

const CURSOR_MAX_LENGTH = 512;
const QUERY_MAX_LENGTH = 40;
const QUERY_PATTERN = /^[0-9A-Za-z가-힣\s\-/(),.&]+$/;
const LIST_VALUE_PATTERN = /^[a-z0-9-]{1,80}$/;

export const RECIPE_SORT_VALUES = [
  "recommended",
  "most-owned",
  "least-missing",
  "fastest",
  "recent",
] as const;
export type RecipeSort = (typeof RECIPE_SORT_VALUES)[number];
export type RankedRecipeSort = Exclude<RecipeSort, "recent">;

export type RecipeCursor =
  | { kind: "recent"; publishedAt: string; id: string }
  | { kind: "ranked"; sort: RankedRecipeSort; offset: number };

export class ApiV1ValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiV1ValidationError";
    this.code = code;
  }
}

export function encodeRecipeCursor(cursor: RecipeCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeRecipeCursor(
  value: string | null,
  expectedSort?: RecipeSort,
): RecipeCursor | null {
  if (!value) {
    return null;
  }
  if (value.length > CURSOR_MAX_LENGTH || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new ApiV1ValidationError("INVALID_CURSOR", "커서 형식을 확인해 주세요.");
  }

  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
      throw new Error("cursor_not_object");
    }
    const row = decoded as Record<string, unknown>;
    if (row.kind === "recent") {
      const publishedAt = typeof row.publishedAt === "string" ? row.publishedAt : "";
      const id = typeof row.id === "string" ? row.id : "";
      const parsedDate = new Date(publishedAt);
      if (
        Object.keys(row).length !== 3 ||
        !isUuidLike(id) ||
        !Number.isFinite(parsedDate.getTime()) ||
        parsedDate.toISOString() !== publishedAt ||
        (expectedSort && expectedSort !== "recent")
      ) {
        throw new Error("cursor_fields_invalid");
      }
      return { kind: "recent", publishedAt, id };
    }
    if (row.kind === "ranked") {
      const sort = typeof row.sort === "string" ? row.sort : "";
      const offset = row.offset;
      if (
        Object.keys(row).length !== 3 ||
        sort === "recent" ||
        !RECIPE_SORT_VALUES.includes(sort as RecipeSort) ||
        !Number.isSafeInteger(offset) ||
        Number(offset) < 1 ||
        Number(offset) > 200 ||
        (expectedSort && expectedSort !== sort)
      ) {
        throw new Error("cursor_fields_invalid");
      }
      return { kind: "ranked", sort: sort as RankedRecipeSort, offset: Number(offset) };
    }
    throw new Error("cursor_kind_invalid");
  } catch (error) {
    if (error instanceof ApiV1ValidationError) {
      throw error;
    }
    throw new ApiV1ValidationError("INVALID_CURSOR", "커서 형식을 확인해 주세요.");
  }
}

export function parseApiSort(value: string | null): RecipeSort {
  const normalized = value?.trim().toLowerCase() || "recommended";
  if (!RECIPE_SORT_VALUES.includes(normalized as RecipeSort)) {
    throw new ApiV1ValidationError("INVALID_FILTER", "sort 필터를 확인해 주세요.");
  }
  return normalized as RecipeSort;
}

export function parseApiLimit(value: string | null, fallback = 24, maximum = 50): number {
  if (!value) {
    return fallback;
  }
  if (!/^\d+$/.test(value)) {
    throw new ApiV1ValidationError("INVALID_LIMIT", "limit은 양의 정수여야 합니다.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new ApiV1ValidationError("INVALID_LIMIT", `limit은 1~${maximum} 범위여야 합니다.`);
  }
  return parsed;
}

export function parseApiQuery(value: string | null): string | null {
  const query = value?.trim() ?? "";
  if (!query) {
    return null;
  }
  if (query.length > QUERY_MAX_LENGTH || !QUERY_PATTERN.test(query)) {
    throw new ApiV1ValidationError("INVALID_QUERY", "검색어 형식을 확인해 주세요.");
  }
  return query;
}

export function parseApiIntegerFilter(
  value: string | null,
  name: string,
  minimum: number,
  maximum: number,
): number | null {
  if (!value) {
    return null;
  }
  if (!/^\d+$/.test(value)) {
    throw new ApiV1ValidationError("INVALID_FILTER", `${name} 필터를 확인해 주세요.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ApiV1ValidationError("INVALID_FILTER", `${name} 필터를 확인해 주세요.`);
  }
  return parsed;
}

export function parseApiIdList(value: string | null, name: string, maximum = 30): string[] {
  if (!value) {
    return [];
  }
  const values = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0 || values.length > maximum || values.some((item) => !LIST_VALUE_PATTERN.test(item))) {
    throw new ApiV1ValidationError("INVALID_FILTER", `${name} 필터를 확인해 주세요.`);
  }
  return [...new Set(values)];
}
