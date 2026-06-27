// 이 파일은 /api/recipes 기반 목록/검색/카테고리 조회와 매칭률 계산을 제공합니다.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useIngredients } from "@/hooks/useIngredients";
import { CURATED_JIPBAB_RECIPES, CURATED_RECIPE_RECORDS } from "@/lib/curated-recipes";
import { getDeviceId } from "@/lib/device-id";
import { cacheRecipes, listCachedRecipePage } from "@/lib/local-db/recipe-cache-repository";
import {
  buildRecipeRecommendationReason,
  findExpiringMatchedIngredients,
  rankRecipeRecommendations,
  type RecipeRecommendationScore,
} from "@/lib/matching";
import { isBeginnerVerifiedRecipe } from "@/lib/recipe-list-labels";
import type {
  DisplayRecipeCategory,
  RecipeCategory,
  RecipeCategoryCounts,
  RecipeListResponse,
  RecipeRecord,
  RecipeWithMatch,
} from "@/types";

const DEFAULT_PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
const RECIPE_SYNC_UNAVAILABLE_MESSAGE = "레시피를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
const VIRTUAL_CATEGORY_LABELS = new Set(["초보가능", "10분요리"]);

const resolveApiUrl = (path: string): string => {
  if (!API_BASE_URL) {
    return path;
  }

  const normalizedBase = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${normalizedBase}${path}`;
};

const buildQueryParams = (
  page: number,
  size: number,
  searchQuery: string,
  selectedCategory: RecipeCategory,
): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));

  const trimmed = searchQuery.trim();
  if (trimmed.length > 0) {
    params.set("q", trimmed);
  }

  if (selectedCategory !== "전체") {
    params.set("category", selectedCategory);
  }
  params.set("includeCounts", "1");

  return params;
};

const normalizeRecipeCategoryLabel = (value: string): RecipeCategory | DisplayRecipeCategory => {
  if (value === "국&찌개") {
    return "국·찌개";
  }
  if (value === "후식") {
    return "디저트";
  }
  return value as RecipeCategory | DisplayRecipeCategory;
};

const getCuratedFallbackCategoryCounts = (searchQuery: string): RecipeCategoryCounts => {
  const query = searchQuery.trim().toLowerCase();
  const counts: RecipeCategoryCounts = { 전체: 0 };

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    if (recipe.publishStatus && recipe.publishStatus !== "published") {
      continue;
    }
    const matchesQuery =
      query.length === 0 ||
      recipe.name.toLowerCase().includes(query) ||
      recipe.ingredients.toLowerCase().includes(query);
    if (!matchesQuery) {
      continue;
    }

    const category = normalizeRecipeCategoryLabel(recipe.category);
    counts.전체 = (counts.전체 ?? 0) + 1;
    counts[category] = (counts[category] ?? 0) + 1;
    if (isBeginnerVerifiedRecipe(recipe)) {
      counts.초보가능 = (counts.초보가능 ?? 0) + 1;
    }
    if (typeof recipe.cookingTime === "number" && recipe.cookingTime <= 10) {
      counts["10분요리"] = (counts["10분요리"] ?? 0) + 1;
    }
  }

  return counts;
};

const normalizeCategoryCounts = (
  primary: RecipeCategoryCounts | undefined,
  fallback: RecipeCategoryCounts = {},
): RecipeCategoryCounts => {
  const merged: RecipeCategoryCounts = { ...fallback };
  for (const [category, count] of Object.entries(primary ?? {})) {
    const normalized = normalizeRecipeCategoryLabel(category);
    merged[normalized] = (merged[normalized] ?? 0) + Number(count ?? 0);
  }
  const realCategoryCount = Object.entries(merged)
    .filter(([category]) => category !== "전체" && !VIRTUAL_CATEGORY_LABELS.has(category))
    .reduce((sum, [, count]) => sum + (count ?? 0), 0);
  merged.전체 = Math.max(merged.전체 ?? 0, realCategoryCount);
  return merged;
};

const getCuratedFallbackPage = (
  page: number,
  size: number,
  searchQuery: string,
  selectedCategory: RecipeCategory,
): { recipes: RecipeRecord[]; totalCount: number } => {
  const query = searchQuery.trim().toLowerCase();
  const filtered = CURATED_RECIPE_RECORDS.filter((recipe) => {
    if (recipe.publishStatus && recipe.publishStatus !== "published") {
      return false;
    }
    const matchesCategory = selectedCategory === "전체" || recipe.category === selectedCategory;
    const matchesQuery =
      query.length === 0 ||
      recipe.name.toLowerCase().includes(query) ||
      recipe.ingredients.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
  const start = (page - 1) * size;
  return {
    recipes: filtered.slice(start, start + size),
    totalCount: filtered.length,
  };
};

export interface UseRecipeCatalogResult {
  recipes: RecipeRecord[];
  loading: boolean;
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
  refresh: () => void;
}

export type RecommendedRecipe = RecipeWithMatch & {
  recommendationScore: RecipeRecommendationScore;
  recommendationReason: string;
};

export interface UseRecipesResult extends UseRecipeCatalogResult {
  recipes: RecommendedRecipe[];
  ingredientsLoading: boolean;
}

export function useRecipeCatalog(pageSize = DEFAULT_PAGE_SIZE): UseRecipeCatalogResult {
  const [rawRecipes, setRawRecipes] = useState<RecipeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [categoryCounts, setCategoryCounts] = useState<RecipeCategoryCounts>({});
  const [searchQuery, setSearchQueryState] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategoryState] = useState<RecipeCategory>("전체");
  const requestIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);

  const totalPages = useMemo(() => {
    if (totalCount <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [pageSize, totalCount]);

  const fetchRecipes = useCallback(
    async (targetPage: number, targetQuery: string, targetCategory: RecipeCategory): Promise<void> => {
      requestAbortRef.current?.abort();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      requestAbortRef.current = controller;
      let cachedPage: { recipes: RecipeRecord[]; totalCount: number } | null = null;

      setLoading(true);
      setError(null);

      try {
        cachedPage = await listCachedRecipePage({
          page: targetPage,
          size: pageSize,
          searchQuery: targetQuery,
          selectedCategory: targetCategory,
        });
        if (cachedPage.recipes.length > 0 && requestId === requestIdRef.current) {
          setRawRecipes(cachedPage.recipes);
          setTotalCount(cachedPage.totalCount);
          setCategoryCounts(getCuratedFallbackCategoryCounts(targetQuery));
          setLoading(false);
        }

        const params = buildQueryParams(targetPage, pageSize, targetQuery, targetCategory);
        const response = await fetch(resolveApiUrl(`/api/recipes?${params.toString()}`), {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            "x-device-id": getDeviceId(),
          },
        });

        const payload = (await response.json()) as RecipeListResponse & { message?: string };

        if (!response.ok) {
          throw new Error(payload.message ?? "레시피를 불러오지 못했습니다.");
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        const recipesFromApi = Array.isArray(payload.recipes) ? payload.recipes : [];
        if (recipesFromApi.length > 0) {
          setRawRecipes(recipesFromApi);
          setTotalCount(Number.isFinite(payload.totalCount) ? payload.totalCount : recipesFromApi.length);
          setCategoryCounts(
            payload.categoryCounts
              ? normalizeCategoryCounts(payload.categoryCounts)
              : getCuratedFallbackCategoryCounts(targetQuery),
          );
          void cacheRecipes(recipesFromApi);
          return;
        }

        const fallback = getCuratedFallbackPage(targetPage, pageSize, targetQuery, targetCategory);
        setRawRecipes(fallback.recipes);
        setTotalCount(fallback.totalCount);
        setCategoryCounts(getCuratedFallbackCategoryCounts(targetQuery));
      } catch {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        if (cachedPage && cachedPage.recipes.length > 0) {
          setRawRecipes(cachedPage.recipes);
          setTotalCount(cachedPage.totalCount);
          setCategoryCounts(getCuratedFallbackCategoryCounts(targetQuery));
          setError(null);
          return;
        }
        const fallback = getCuratedFallbackPage(targetPage, pageSize, targetQuery, targetCategory);
        setRawRecipes(fallback.recipes);
        setTotalCount(fallback.totalCount);
        setCategoryCounts(getCuratedFallbackCategoryCounts(targetQuery));
        setError(fallback.totalCount > 0 ? null : RECIPE_SYNC_UNAVAILABLE_MESSAGE);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [pageSize],
  );

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value);
    setPage(1);
  }, []);

  const setSelectedCategory = useCallback((category: RecipeCategory) => {
    setSelectedCategoryState(category);
    setPage(1);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    if (!Number.isFinite(nextPage)) {
      return;
    }
    setPage(Math.max(1, Math.floor(nextPage)));
  }, []);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const refresh = useCallback(() => {
    void fetchRecipes(page, debouncedQuery, selectedCategory);
  }, [debouncedQuery, fetchRecipes, page, selectedCategory]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    void fetchRecipes(page, debouncedQuery, selectedCategory);
  }, [debouncedQuery, fetchRecipes, page, selectedCategory]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort();
    };
  }, []);

  return {
    recipes: rawRecipes,
    loading,
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
    refresh,
  };
}

export function useRecipes(pageSize = DEFAULT_PAGE_SIZE): UseRecipesResult {
  const { ingredients, loading: ingredientsLoading } = useIngredients();
  const catalog = useRecipeCatalog(pageSize);

  const mergedCatalogRecipes = useMemo(() => {
    const query = catalog.searchQuery.trim().toLowerCase();
    const category = catalog.selectedCategory;
    const curatedMatches = CURATED_RECIPE_RECORDS.filter((recipe) => {
      const matchesCategory = category === "전체" || recipe.category === category;
      const matchesQuery =
        query.length === 0 ||
        recipe.name.toLowerCase().includes(query) ||
        recipe.ingredients.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
    const existingIds = new Set(catalog.recipes.map((recipe) => recipe.id));
    return [
      ...curatedMatches.filter((recipe) => !existingIds.has(recipe.id)),
      ...catalog.recipes,
    ];
  }, [catalog.recipes, catalog.searchQuery, catalog.selectedCategory]);

  const recipes = useMemo<RecommendedRecipe[]>(() => {
    return rankRecipeRecommendations(mergedCatalogRecipes, ingredients).map(({ recipe, match, score }) => {
      const expiringIngredients = findExpiringMatchedIngredients(match.matchedIngredients, ingredients);

      return {
        ...recipe,
        ...match,
        recommendationScore: score,
        recommendationReason: buildRecipeRecommendationReason({
          recipeName: recipe.name,
          matchedIngredients: match.matchedIngredients,
          missingIngredients: match.missingIngredients,
          expiringIngredients,
        }),
      };
    });
  }, [ingredients, mergedCatalogRecipes]);

  return {
    ...catalog,
    recipes,
    ingredientsLoading,
  };
}
