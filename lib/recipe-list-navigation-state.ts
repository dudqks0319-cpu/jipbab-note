const RECIPE_LIST_HISTORY_KEY = "__jipbabRecipeList";
const MAX_RECIPE_LIST_PAGE = 100;
const MAX_CURSOR_LENGTH = 4_096;
const MAX_FILTER_KEY_LENGTH = 4_096;
const MAX_LOCATION_KEY_LENGTH = 2_048;
const MAX_SCROLL_Y = 10_000_000;

type UnknownRecord = Record<string, unknown>;

export interface RecipeListPaginationState {
  version: 1;
  page: number;
  filterKey: string;
  cursorByPage: Array<[number, string | null]>;
}

export interface RecipeListNavigationState {
  version: 1;
  locationKey: string;
  scrollY: number;
  pagination: RecipeListPaginationState;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidLocationKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/recipe") &&
    value.length <= MAX_LOCATION_KEY_LENGTH
  );
}

export function normalizeRecipeListPaginationState(
  value: unknown,
): RecipeListPaginationState | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (
    !Number.isSafeInteger(value.page) ||
    (value.page as number) < 1 ||
    (value.page as number) > MAX_RECIPE_LIST_PAGE ||
    typeof value.filterKey !== "string" ||
    value.filterKey.length === 0 ||
    value.filterKey.length > MAX_FILTER_KEY_LENGTH ||
    !Array.isArray(value.cursorByPage) ||
    value.cursorByPage.length === 0 ||
    value.cursorByPage.length > MAX_RECIPE_LIST_PAGE
  ) {
    return null;
  }

  const cursorByPage = new Map<number, string | null>();
  for (const entry of value.cursorByPage) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [page, cursor] = entry;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > MAX_RECIPE_LIST_PAGE ||
      cursorByPage.has(page)
    ) {
      return null;
    }
    if (page === 1) {
      if (cursor !== null) return null;
    } else if (
      typeof cursor !== "string" ||
      cursor.length === 0 ||
      cursor.length > MAX_CURSOR_LENGTH
    ) {
      return null;
    }
    cursorByPage.set(page, cursor);
  }

  const page = value.page as number;
  if (cursorByPage.get(1) !== null || !cursorByPage.has(page)) return null;
  for (let visitedPage = 1; visitedPage <= page; visitedPage += 1) {
    if (!cursorByPage.has(visitedPage)) return null;
  }

  return {
    version: 1,
    page,
    filterKey: value.filterKey,
    cursorByPage: [...cursorByPage.entries()].sort(([left], [right]) => left - right),
  };
}

export function createRecipeListNavigationState({
  locationKey,
  scrollY,
  pagination,
}: {
  locationKey: string;
  scrollY: number;
  pagination: RecipeListPaginationState;
}): RecipeListNavigationState {
  const normalizedPagination = normalizeRecipeListPaginationState(pagination);
  if (
    !isValidLocationKey(locationKey) ||
    !Number.isFinite(scrollY) ||
    scrollY < 0 ||
    scrollY > MAX_SCROLL_Y ||
    !normalizedPagination
  ) {
    throw new TypeError("유효하지 않은 레시피 목록 이동 상태입니다.");
  }

  return {
    version: 1,
    locationKey,
    scrollY,
    pagination: normalizedPagination,
  };
}

export function withRecipeListNavigationState(
  historyState: unknown,
  navigationState: RecipeListNavigationState,
): UnknownRecord {
  const baseState = isRecord(historyState) ? historyState : {};
  return { ...baseState, [RECIPE_LIST_HISTORY_KEY]: navigationState };
}

export function readRecipeListNavigationState(
  historyState: unknown,
  currentLocationKey: string,
): RecipeListNavigationState | null {
  if (!isRecord(historyState) || !isValidLocationKey(currentLocationKey)) return null;
  const value = historyState[RECIPE_LIST_HISTORY_KEY];
  if (!isRecord(value) || value.version !== 1 || value.locationKey !== currentLocationKey) {
    return null;
  }
  if (
    !Number.isFinite(value.scrollY) ||
    (value.scrollY as number) < 0 ||
    (value.scrollY as number) > MAX_SCROLL_Y
  ) {
    return null;
  }
  const pagination = normalizeRecipeListPaginationState(value.pagination);
  if (!pagination) return null;

  return {
    version: 1,
    locationKey: currentLocationKey,
    scrollY: value.scrollY as number,
    pagination,
  };
}
