// 이 파일은 /api/recipes 기반 목록/검색/카테고리 조회와 매칭률 계산을 제공합니다.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useIngredients } from "@/hooks/useIngredients";
import { getDeviceId } from "@/lib/device-id";
import { calculateRecipeIngredientMatch } from "@/lib/matching";
import type { RecipeCategory, RecipeListResponse, RecipeRecord, RecipeWithMatch } from "@/types";

const DEFAULT_PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";

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

  return params;
};

export interface UseRecipesResult {
  recipes: RecipeWithMatch[];
  loading: boolean;
  error: string | null;
  page: number;
  totalCount: number;
  totalPages: number;
  searchQuery: string;
  selectedCategory: RecipeCategory;
  ingredientsLoading: boolean;
  setSearchQuery: (value: string) => void;
  setSelectedCategory: (category: RecipeCategory) => void;
  goToPage: (nextPage: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
}

export function useRecipes(pageSize = DEFAULT_PAGE_SIZE): UseRecipesResult {
  const { ingredients, loading: ingredientsLoading } = useIngredients();
  const [rawRecipes, setRawRecipes] = useState<RecipeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchQuery, setSearchQueryState] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategoryState] = useState<RecipeCategory>("전체");
  const requestIdRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);

  const ingredientNames = useMemo(() => ingredients.map((item) => item.name), [ingredients]);

  const recipes = useMemo<RecipeWithMatch[]>(() => {
    return rawRecipes.map((recipe) => {
      const match = calculateRecipeIngredientMatch(ingredientNames, recipe.ingredients);
      return {
        ...recipe,
        ...match,
      };
    });
  }, [ingredientNames, rawRecipes]);

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

      setLoading(true);
      setError(null);

      try {
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
        setRawRecipes(recipesFromApi);
        setTotalCount(Number.isFinite(payload.totalCount) ? payload.totalCount : 0);
      } catch (caught) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        setRawRecipes([]);
        setTotalCount(0);
        setError(caught instanceof Error ? caught.message : "레시피 조회 중 오류가 발생했습니다.");
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
    recipes,
    loading,
    error,
    page,
    totalCount,
    totalPages,
    searchQuery,
    selectedCategory,
    ingredientsLoading,
    setSearchQuery,
    setSelectedCategory,
    goToPage,
    nextPage,
    prevPage,
    refresh,
  };
}
