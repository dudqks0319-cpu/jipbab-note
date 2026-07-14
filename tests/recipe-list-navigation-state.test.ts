import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createRecipeListNavigationState,
  readRecipeListNavigationState,
  withRecipeListNavigationState,
  type RecipeListPaginationState,
} from "../lib/recipe-list-navigation-state.ts";

const locationKey = "/recipe?q=%EA%B3%84%EB%9E%80&quick=beginner";

const pagination: RecipeListPaginationState = {
  version: 1,
  page: 3,
  filterKey: '["계란","전체","","recommended",null,null,null]',
  cursorByPage: [
    [1, null],
    [2, "cursor-page-2"],
    [3, "cursor-page-3"],
  ],
};

test("recipe list navigation state preserves Next history fields and restores exact route state", () => {
  const snapshot = createRecipeListNavigationState({
    locationKey,
    scrollY: 812.5,
    pagination,
  });
  const nextHistoryState = withRecipeListNavigationState(
    { __NA: true, tree: ["", { children: ["recipe", {}] }] },
    snapshot,
  );

  assert.equal(nextHistoryState.__NA, true);
  assert.deepEqual(nextHistoryState.tree, ["", { children: ["recipe", {}] }]);
  assert.deepEqual(readRecipeListNavigationState(nextHistoryState, locationKey), snapshot);
  assert.equal(readRecipeListNavigationState(nextHistoryState, "/recipe?quick=ready"), null);
});

test("recipe list navigation state rejects malformed or unsafe history payloads", () => {
  const invalidPayloads = [
    null,
    { version: 2, locationKey, scrollY: 10, pagination },
    { version: 1, locationKey, scrollY: -1, pagination },
    { version: 1, locationKey, scrollY: Number.POSITIVE_INFINITY, pagination },
    {
      version: 1,
      locationKey,
      scrollY: 10,
      pagination: { ...pagination, page: 4 },
    },
    {
      version: 1,
      locationKey,
      scrollY: 10,
      pagination: {
        ...pagination,
        cursorByPage: [
          [1, null],
          [2, "x".repeat(4_097)],
          [3, "cursor-page-3"],
        ],
      },
    },
  ];

  for (const payload of invalidPayloads) {
    assert.equal(
      readRecipeListNavigationState({ __jipbabRecipeList: payload }, locationKey),
      null,
    );
  }
});

test("recipe list page connects full filter reset and back-navigation restoration", async () => {
  const source = await readFile(new URL("../app/recipe/page.tsx", import.meta.url), "utf8");

  assert.match(source, /const resetFilters = useCallback\(/);
  assert.match(source, /setSearchQuery\(''\)/);
  assert.match(source, /setSelectedCategory\('전체'\)/);
  assert.match(source, /setQuickFilter\('all'\)/);
  assert.match(source, /setDifficultyFilter\('all'\)/);
  assert.match(source, /setTimeFilter\('all'\)/);
  assert.match(source, /setToolFilter\('all'\)/);
  assert.match(source, /setFridgeFilter\('all'\)/);
  assert.match(source, /setSortMode\('recommended'\)/);
  assert.match(source, /RESTORABLE_RECIPE_QUICK_FILTERS/);
  assert.match(source, /RESTORABLE_RECIPE_QUICK_FILTERS\.has\(quick as RecipeQuickFilter\)/);
  assert.match(source, /restorePaginationState\(navigationState\.pagination\)/);
  assert.match(source, /document\.getElementById\('main-content'\)/);
  assert.match(source, /scrollElement\.scrollTop/);
  assert.match(source, /scrollElement\.scrollTo\(\{ top: scrollY/);
  assert.match(source, /loadedPage !== page/);
  assert.match(source, /onClick=\{persistRecipeListNavigation\}/);
  assert.match(source, /onClick=\{resetFilters\}/);
});
