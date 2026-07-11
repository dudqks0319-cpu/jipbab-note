// 이 파일은 레시피 즐겨찾기 토글/목록 상태를 IndexedDB local-first 저장소로 관리합니다.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { subscribeLocalDb } from "@/lib/local-db";
import {
  clearFavoriteRecipes,
  listFavoriteRecipes,
  removeFavoriteRecipe,
  upsertFavoriteRecipe,
} from "@/lib/local-db/favorites-repository";
import { LOCAL_DB_STORES } from "@/lib/local-db/schema";
import { isRecipePublicationEvidenceApproved } from "@/lib/recipe-publication";
import type { FavoriteRecipeSummary } from "@/types";

type FavoriteSeed = Omit<FavoriteRecipeSummary, "savedAt">;

export interface UseFavoritesResult {
  favorites: FavoriteRecipeSummary[];
  favoriteIds: Set<string>;
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipe: FavoriteSeed) => boolean;
  removeFavorite: (recipeId: string) => void;
  clearFavorites: () => void;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoriteRecipeSummary[]>([]);

  const refreshFavorites = useCallback(async (): Promise<void> => {
    const storedFavorites = await listFavoriteRecipes();
    setFavorites(
      storedFavorites.filter((favorite) =>
        isRecipePublicationEvidenceApproved(favorite.publicationEvidence),
      ),
    );
  }, []);

  useEffect(() => {
    void refreshFavorites();
    return subscribeLocalDb(LOCAL_DB_STORES.favoriteRecipes, () => {
      void refreshFavorites();
    });
  }, [refreshFavorites]);

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
        void removeFavoriteRecipe(recipe.id);
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
      void upsertFavoriteRecipe({
        ...nextFavorite,
        deletedAt: null,
        syncStatus: "pending_update",
        lastSyncedAt: null,
      });
      return true;
    },
    [favoriteIds, favorites],
  );

  const removeFavorite = useCallback(
    (recipeId: string): void => {
      const nextItems = favorites.filter((item) => item.id !== recipeId);
      setFavorites(nextItems);
      void removeFavoriteRecipe(recipeId);
    },
    [favorites],
  );

  const clearFavorites = useCallback((): void => {
    setFavorites([]);
    void clearFavoriteRecipes();
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
