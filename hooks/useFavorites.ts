// 이 파일은 레시피 즐겨찾기 토글/목록 상태를 localStorage로 관리합니다.
"use client";

import { useCallback, useMemo, useState } from "react";

import type { FavoriteRecipeSummary } from "@/types";

const STORAGE_KEY = "jipbab-note-favorite-recipes";

type FavoriteSeed = Omit<FavoriteRecipeSummary, "savedAt">;

function safeReadFavorites(): FavoriteRecipeSummary[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is FavoriteRecipeSummary => {
        return (
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "name" in item &&
          "category" in item &&
          "savedAt" in item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.category === "string" &&
          typeof item.savedAt === "string"
        );
      })
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch {
    return [];
  }
}

function safeWriteFavorites(nextItems: FavoriteRecipeSummary[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

export interface UseFavoritesResult {
  favorites: FavoriteRecipeSummary[];
  favoriteIds: Set<string>;
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipe: FavoriteSeed) => boolean;
  removeFavorite: (recipeId: string) => void;
  clearFavorites: () => void;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoriteRecipeSummary[]>(() => safeReadFavorites());

  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.id)), [favorites]);

  const isFavorite = useCallback(
    (recipeId: string): boolean => {
      return favoriteIds.has(recipeId);
    },
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (recipe: FavoriteSeed): boolean => {
      const exists = favoriteIds.has(recipe.id);

      if (exists) {
        const nextItems = favorites.filter((item) => item.id !== recipe.id);
        setFavorites(nextItems);
        safeWriteFavorites(nextItems);
        return false;
      }

      const nextFavorite: FavoriteRecipeSummary = {
        ...recipe,
        savedAt: new Date().toISOString(),
      };
      const nextItems = [nextFavorite, ...favorites].sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );
      setFavorites(nextItems);
      safeWriteFavorites(nextItems);
      return true;
    },
    [favoriteIds, favorites],
  );

  const removeFavorite = useCallback(
    (recipeId: string): void => {
      const nextItems = favorites.filter((item) => item.id !== recipeId);
      setFavorites(nextItems);
      safeWriteFavorites(nextItems);
    },
    [favorites],
  );

  const clearFavorites = useCallback((): void => {
    setFavorites([]);
    safeWriteFavorites([]);
  }, []);

  return {
    favorites,
    favoriteIds,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
  };
}
