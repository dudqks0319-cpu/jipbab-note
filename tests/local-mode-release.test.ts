import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { summarizeAuthMigrationState } from "../lib/auth-migration-summary.ts";
import { mergeIngredientRecords } from "../lib/ingredient-sync.ts";
import { mergeShoppingItems } from "../lib/shopping-sync.ts";
import type { DeviceDataMigrationResult, IngredientRecord, ShoppingItem } from "../types/index.ts";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const releaseGateSource = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGateSource = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const goalCheckSource = readFileSync("scripts/verify-goal-completion.mjs", "utf8");

function ingredient(overrides: Partial<IngredientRecord>): IngredientRecord {
  return {
    id: "ingredient-1",
    deviceId: "device-1",
    userId: null,
    name: "두부",
    category: "유제품",
    storageType: "냉장",
    quantity: null,
    expiryDate: null,
    purchaseDate: null,
    openedAt: null,
    storageLocation: null,
    unitPrice: null,
    purchasePlace: null,
    consumedAt: null,
    discardedAt: null,
    repeatPurchase: false,
    barcode: null,
    imageUrl: null,
    memo: null,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides,
  };
}

function shoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "shopping-1",
    deviceId: "device-1",
    userId: null,
    name: "두부",
    quantity: "1모",
    category: "유제품",
    checked: false,
    sourceRecipeId: null,
    sourceRecipeName: null,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides,
  };
}

function migrationResult(overrides: Partial<DeviceDataMigrationResult> = {}): DeviceDataMigrationResult {
  return {
    totalMigratedCount: 0,
    localMigratedCount: 0,
    tableResults: [],
    ...overrides,
  };
}

test("local mode release check is wired into package, release gates, and goal completion", () => {
  assert.equal(packageJson.scripts["check:local-mode-release"], "node scripts/check-local-mode-release.mjs");
  assert.match(releaseGateSource, /scripts\/check-local-mode-release\.mjs/);
  assert.match(ciGateSource, /scripts\/check-local-mode-release\.mjs/);
  assert.match(goalCheckSource, /scripts\/check-local-mode-release\.mjs/);
});

test("local fridge and shopping rows survive empty Supabase responses", () => {
  const localIngredient = ingredient({ id: "local-ingredient", name: "감자" });
  const localShopping = shoppingItem({ id: "local-shopping", name: "계란" });

  assert.deepEqual(mergeIngredientRecords([localIngredient], []), [localIngredient]);
  assert.deepEqual(mergeShoppingItems([localShopping], []), [localShopping]);
});

test("newer Supabase rows can replace stale local copies without deleting local-only rows", () => {
  const localOnly = ingredient({ id: "local-only", name: "대파", updatedAt: "2026-05-22T00:00:00.000Z" });
  const staleLocal = ingredient({ id: "shared", name: "로컬 양파", updatedAt: "2026-05-21T00:00:00.000Z" });
  const freshRemote = ingredient({ id: "shared", name: "원격 양파", updatedAt: "2026-05-22T00:00:00.000Z" });
  const merged = mergeIngredientRecords([localOnly, staleLocal], [freshRemote]);

  assert.equal(merged.length, 2);
  assert.equal(merged.find((item) => item.id === "shared")?.name, "원격 양파");
  assert.equal(merged.find((item) => item.id === "local-only")?.name, "대파");
});

test("auth migration state does not hide sync errors or skipped local tables", () => {
  const failed = summarizeAuthMigrationState({
    migrating: false,
    error: null,
    migrationResult: migrationResult({
      tableResults: [
        { table: "ingredients", migratedCount: 0, skipped: false, reason: "permission denied" },
      ],
    }),
  });
  const partial = summarizeAuthMigrationState({
    migrating: false,
    error: null,
    migrationResult: migrationResult({
      tableResults: [
        { table: "community_posts", migratedCount: 0, skipped: true, reason: "테이블 없음" },
      ],
    }),
  });

  assert.equal(failed.health, "needs-attention");
  assert.equal(failed.statLabel, "확인필요");
  assert.equal(partial.health, "partial");
  assert.equal(partial.statLabel, "일부확인");
});
