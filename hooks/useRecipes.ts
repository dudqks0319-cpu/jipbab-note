"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useIngredients } from "@/hooks/useIngredients";
import {
  fetchRecipeListV1,
  RecipeApiV1ClientError,
  recipeApiV1CardToMatch,
  resolveIngredientCatalogIds,
  type RecipeApiV1MatchedCard,
  type RecipeApiV1Sort,
} from "@/lib/recipe-api-v1-client";
import { resolveLegacyRecipeCategory } from "@/lib/recipe-category-taxonomy";
import {
  normalizeRecipeListPaginationState,
  type RecipeListPaginationState,
} from "@/lib/recipe-list-navigation-state";
import { filterPublicationApprovedRecipes } from "@/lib/recipe-publication";
import type {
  RecipeCategory,
  RecipeCategoryCounts,
  RecipeRecord,
} from "@/types";

const DEFAULT_PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const VIRTUAL_CATEGORY_LABELS = ["초보가능", "10분요리"] as const;
const RECIPE_SYNC_UNAVAILABLE_MESSAGE = "레시피를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

function recipeLoadErrorMessage(error: unknown): string {
  if (error instanceof RecipeApiV1ClientError && error.status === 429) {
    return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error instanceof RecipeApiV1ClientError && error.status === 503) {
    return "레시피 서비스를 점검하고 있습니다. 잠시 후 다시 시도해 주세요.";
  }
  return RECIPE_SYNC_UNAVAILABLE_MESSAGE;
}

export interface UseRecipeCatalogResult {
  recipes: RecipeApiV1MatchedCard[];
  loading: boolean;
  hasLoaded: boolean;
  loadedPage: number | null;
  error: string | null;
  page: number;
  totalCount: number;
  totalPages: number;
  categoryCounts: RecipeCategoryCounts;
  searchQuery: string;
  selectedCategory: RecipeCategory;
  setSearchQuery: (value: string) => void;
  setSelectedCategory: (category: RecipeCategory) => void;
  goToPage: (nextPage: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  capturePaginationState: () => RecipeListPaginationState;
  restorePaginationState: (state: unknown) => boolean;
  refresh: () => void;
}

export type RecommendedRecipe = RecipeApiV1MatchedCard;

export interface UseRecipesResult extends UseRecipeCatalogResult {
  recipes: RecommendedRecipe[];
  ingredientsLoading: boolean;
}

function categoryCountsFor(records: RecipeRecord[]): RecipeCategoryCounts {
  const counts: RecipeCategoryCounts = { 전체: records.length };
  for (const recipe of records) {
    const category = recipe.category as RecipeCategory;
    counts[category] = (counts[category] ?? 0) + 1;
    counts[VIRTUAL_CATEGORY_LABELS[0]] = (counts[VIRTUAL_CATEGORY_LABELS[0]] ?? 0) + 1;
    if (typeof recipe.totalMinutes === "number" && recipe.totalMinutes <= 10) {
      counts[VIRTUAL_CATEGORY_LABELS[1]] = (counts[VIRTUAL_CATEGORY_LABELS[1]] ?? 0) + 1;
    }
  }
  return counts;
}

export function useRecipeCatalog(
  pageSize = DEFAULT_PAGE_SIZE,
  options: {
    ingredientIds?: string[];
    sort?: RecipeApiV1Sort;
    difficulty?: number | null;
    maxTotalTime?: number | null;
    maxMissingIngredients?: number | null;
    enabled?: boolean;
  } = {},
): UseRecipeCatalogResult {
  const safePageSize = Math.min(Math.max(Math.floor(pageSize), 1), 50);
  const ingredientKey = (options.ingredientIds ?? []).join(",");
  const sort = options.sort ?? "recommended";
  const [recipes, setRecipes] = useState<RecipeApiV1MatchedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<RecipeCategoryCounts>({});
  const [searchQuery, setSearchQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategoryState] = useState<RecipeCategory>("전체");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const cursorByPageRef = useRef(new Map<number, string | null>([[1, null]]));
  const pendingPaginationRef = useRef<RecipeListPaginationState | null>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const filterKey = JSON.stringify([
    debouncedQuery,
    selectedCategory,
    ingredientKey,
    sort,
    options.difficulty ?? null,
    options.maxTotalTime ?? null,
    options.maxMissingIngredients ?? null,
  ]);
  const filterKeyRef = useRef(filterKey);

  useEffect(() => {
    filterKeyRef.current = filterKey;
  }, [filterKey]);

  const fetchRecipes = useCallback(async () => {
    abortRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setHasLoaded(false);
    setLoadedPage(null);
    setError(null);

    const categoryResolution =
      selectedCategory === "전체" ? null : resolveLegacyRecipeCategory(selectedCategory);
    try {
      const data = await fetchRecipeListV1(
        {
          q: debouncedQuery,
          category:
            categoryResolution?.status === "mapped" ? categoryResolution.categoryId : null,
          ingredientIds: ingredientKey ? ingredientKey.split(",") : [],
          sort,
          difficulty: options.difficulty,
          maxTotalTime: options.maxTotalTime,
          maxMissingIngredients: options.maxMissingIngredients,
          cursor: cursorByPageRef.current.get(page) ?? null,
          limit: safePageSize,
        },
        controller.signal,
      );
      if (requestId !== requestIdRef.current) return;

      const mapped = filterPublicationApprovedRecipes(
        data.recipes.map(recipeApiV1CardToMatch),
      );
      setRecipes(mapped);
      setNextCursor(data.nextCursor);
      setCategoryCounts(categoryCountsFor(mapped));
      setTotalCount((page - 1) * safePageSize + mapped.length + (data.nextCursor ? 1 : 0));
    } catch (fetchError) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setRecipes([]);
      setNextCursor(null);
      setCategoryCounts({});
      setTotalCount(0);
      setError(recipeLoadErrorMessage(fetchError));
    } finally {
      if (requestId === requestIdRef.current) {
        pendingPaginationRef.current = null;
        setLoading(false);
        setHasLoaded(true);
        setLoadedPage(page);
      }
    }
  }, [
    debouncedQuery,
    ingredientKey,
    options.difficulty,
    options.maxMissingIngredients,
    options.maxTotalTime,
    page,
    safePageSize,
    selectedCategory,
    setCategoryCounts,
    setError,
    setHasLoaded,
    setLoading,
    setLoadedPage,
    setNextCursor,
    setRecipes,
    setTotalCount,
    sort,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const pendingPagination = pendingPaginationRef.current;
    if (pendingPagination?.filterKey === filterKey) {
      cursorByPageRef.current = new Map(pendingPagination.cursorByPage);
      setPage(pendingPagination.page);
      return;
    }
    cursorByPageRef.current = new Map([[1, null]]);
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    if (options.enabled === false || debouncedQuery !== searchQuery.trim()) {
      abortRef.current?.abort();
      setLoading(false);
      return;
    }
    void fetchRecipes();
  }, [debouncedQuery, fetchRecipes, options.enabled, refreshToken, searchQuery]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const setSearchQuery = useCallback(
    (value: string) => setSearchQueryState(value),
    [setSearchQueryState],
  );
  const setSelectedCategory = useCallback((category: RecipeCategory) => {
    setSelectedCategoryState(category);
  }, [setSelectedCategoryState]);
  const nextPage = useCallback(() => {
    if (!nextCursor) return;
    cursorByPageRef.current.set(page + 1, nextCursor);
    setPage((current) => current + 1);
  }, [nextCursor, page, setPage]);
  const prevPage = useCallback(
    () => setPage((current) => Math.max(1, current - 1)),
    [setPage],
  );
  const goToPage = useCallback(
    (nextPageNumber: number) => {
      const normalized = Math.max(1, Math.floor(nextPageNumber));
      if (normalized === page || !cursorByPageRef.current.has(normalized)) return;
      setPage(normalized);
    },
    [page, setPage],
  );
  const capturePaginationState = useCallback(
    (): RecipeListPaginationState => ({
      version: 1,
      page,
      filterKey,
      cursorByPage: [...cursorByPageRef.current.entries()].sort(
        ([left], [right]) => left - right,
      ),
    }),
    [filterKey, page],
  );
  const restorePaginationState = useCallback((state: unknown): boolean => {
    const normalized = normalizeRecipeListPaginationState(state);
    if (!normalized) return false;
    pendingPaginationRef.current = normalized;
    if (normalized.filterKey === filterKeyRef.current) {
      cursorByPageRef.current = new Map(normalized.cursorByPage);
      setPage(normalized.page);
    }
    return true;
  }, [setPage]);
  const refresh = useCallback(
    () => setRefreshToken((current) => current + 1),
    [setRefreshToken],
  );
  const totalPages = nextCursor ? page + 1 : page;

  return {
    recipes,
    loading,
    hasLoaded,
    loadedPage,
    error,
    page,
    totalCount,
    totalPages,
    categoryCounts,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    goToPage,
    nextPage,
    prevPage,
    capturePaginationState,
    restorePaginationState,
    refresh,
  };
}

export function useRecipes(
  pageSize = DEFAULT_PAGE_SIZE,
  options: {
    sort?: RecipeApiV1Sort;
    difficulty?: number | null;
    maxTotalTime?: number | null;
    maxMissingIngredients?: number | null;
    enabled?: boolean;
  } = {},
): UseRecipesResult {
  const { ingredients, loading: ingredientsLoading } = useIngredients();
  const activeIngredients = useMemo(
    () => ingredients.filter((item) => !item.consumedAt && !item.discardedAt),
    [ingredients],
  );
  const ingredientIds = useMemo(
    () => resolveIngredientCatalogIds(activeIngredients.map((item) => item.name)),
    [activeIngredients],
  );
  const catalog = useRecipeCatalog(pageSize, { ingredientIds, ...options });
  const recipes = useMemo<RecommendedRecipe[]>(
    () => filterPublicationApprovedRecipes(catalog.recipes),
    [catalog.recipes],
  );

  return { ...catalog, recipes, ingredientsLoading };
}
