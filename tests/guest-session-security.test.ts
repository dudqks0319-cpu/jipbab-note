import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clearLocalStore, putLocalRecords, readAllFromStore } from "../lib/local-db/index.ts";
import { LOCAL_DB_STORES } from "../lib/local-db/schema.ts";
import { migrateDeviceData } from "../lib/migrate-device-data.ts";

const sharedClientSource = readFileSync("lib/supabase.ts", "utf8");
const sessionSource = readFileSync("lib/supabase-session.ts", "utf8");
const ingredientSyncSource = readFileSync("lib/sync/ingredient-sync-service.ts", "utf8");
const shoppingSyncSource = readFileSync("lib/sync/shopping-sync-service.ts", "utf8");
const familyHookSource = readFileSync("hooks/useFamilyShare.ts", "utf8");
const familyRouteSource = readFileSync("app/api/family-groups/route.ts", "utf8");
const commentsSource = readFileSync("components/recipe/RecipeComments.tsx", "utf8");
const mergeRouteSource = readFileSync("app/api/auth/merge-anonymous/route.ts", "utf8");
const migrationSource = readFileSync(
  "supabase/migrations/20260710140000_replace_device_guest_auth_with_signed_sessions.sql",
  "utf8",
).toLowerCase();
const legacyMigrationSource = readFileSync("lib/migrate-device-data.ts", "utf8");

function policyBlock(policyName: string): string {
  const marker = `create policy ${policyName.toLowerCase()}`;
  const start = migrationSource.lastIndexOf(marker);
  assert.notEqual(start, -1, `${policyName} must exist in the signed-session migration`);
  const end = migrationSource.indexOf(";", start);
  return migrationSource.slice(start, end + 1);
}

test("browser Supabase requests never attach caller-controlled device identity", () => {
  assert.doesNotMatch(sharedClientSource, /x-device-id/i);
  assert.doesNotMatch(sharedClientSource, /latestDeviceId/);
  assert.doesNotMatch(familyHookSource, /x-device-id/i);
  assert.doesNotMatch(commentsSource, /x-device-id/i);
});

test("guest cloud sync uses a verified Supabase anonymous session behind an explicit flag", () => {
  assert.match(sessionSource, /NEXT_PUBLIC_SUPABASE_ANONYMOUS_AUTH_ENABLED/);
  assert.match(sessionSource, /auth\.getUser\(\)/);
  assert.match(sessionSource, /auth\.signInAnonymously\(\)/);
  assert.match(sessionSource, /isAnonymousSupabaseUser/);
});

test("private sync payloads require the signed auth uid", () => {
  for (const source of [ingredientSyncSource, shoppingSyncSource]) {
    assert.match(source, /ensureSignedSupabaseUser/);
    assert.match(source, /user_id: userId/);
    assert.doesNotMatch(source, /userId \?\? (record|item)\.userId/);
    assert.doesNotMatch(source, /Promise<string \| null>/);
  }
});

test("family cloud sharing rejects missing, invalid, and anonymous bearer sessions", () => {
  assert.match(familyRouteSource, /getAuthenticatedServerUser/);
  assert.match(familyRouteSource, /isAnonymousSupabaseUser/);
  assert.match(familyRouteSource, /로그인이 필요합니다/);
  assert.match(familyRouteSource, /가족 공유는 일반 계정 로그인이 필요합니다/);
  assert.doesNotMatch(familyRouteSource, /request\.headers\.get\("x-device-id"\)/);
  assert.doesNotMatch(familyRouteSource, /userId: string \| null/);
});

test("latest RLS policies authorize signed uid and never a request header", () => {
  for (const policyName of [
    "ingredients_select_own",
    "ingredients_insert_own",
    "favorites_select_own",
    "favorites_insert_own",
    "shopping_items_select_own",
    "shopping_items_insert_own",
    "community_posts_insert_own",
    "community_images_insert_own_path",
  ]) {
    const block = policyBlock(policyName);
    assert.match(block, /auth\.uid\(\)/);
    assert.doesNotMatch(block, /current_device_id|request_header|device_id\s*=/);
  }

  assert.match(migrationSource, /select null::text/);
  assert.match(migrationSource, /revoke all on function app\.current_device_id\(\) from anon, authenticated/);
  assert.match(migrationSource, /grant execute on function public\.merge_anonymous_user_data\(uuid, uuid\) to service_role/);
  assert.doesNotMatch(migrationSource, /grant execute[^;]+to anon/);
});

test("login migration never claims remote rows by a local device id", () => {
  assert.doesNotMatch(legacyMigrationSource, /\.eq\("device_id"/);
  assert.doesNotMatch(legacyMigrationSource, /\.is\("user_id", null\)/);
  assert.match(legacyMigrationSource, /로컬 데이터/);
});

test("anonymous merge verifies both users and delegates only to the service-role RPC", () => {
  assert.match(mergeRouteSource, /getAuthenticatedServerUser\(request\.headers\.get\("authorization"\)\)/);
  assert.match(mergeRouteSource, /getAuthenticatedServerUser\(`Bearer \$\{anonymousAccessToken\}`\)/);
  assert.match(mergeRouteSource, /isPermanentSupabaseUser\(permanentUser\)/);
  assert.match(mergeRouteSource, /isAnonymousSupabaseUser\(anonymousUser\)/);
  assert.match(mergeRouteSource, /admin\.rpc\("merge_anonymous_user_data"/);
  assert.match(mergeRouteSource, /admin\.auth\.admin\.deleteUser\(anonymousUser\.id\)/);
  assert.doesNotMatch(mergeRouteSource, /console\.(?:log|error)/);
});

test("verified login re-owns local records without remote device-id queries", async () => {
  const deviceId = `guest-security-${Date.now()}`;
  const userId = "5f3d5ac2-4439-4e16-b7fb-04176506622c";
  const now = new Date().toISOString();
  const stores = [
    LOCAL_DB_STORES.ingredients,
    LOCAL_DB_STORES.shoppingItems,
    LOCAL_DB_STORES.favoriteRecipes,
    LOCAL_DB_STORES.fridgeEvents,
    LOCAL_DB_STORES.pendingSyncQueue,
  ];

  try {
    await Promise.all(stores.map((store) => clearLocalStore(store)));
    await putLocalRecords(LOCAL_DB_STORES.ingredients, [{
      id: "ingredient",
      deviceId,
      userId: null,
      familyGroupId: null,
      name: "계란",
      category: "유제품",
      storageType: "냉장",
      quantity: "2개",
      expiryDate: null,
      barcode: null,
      imageUrl: null,
      memo: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: "synced",
      lastSyncedAt: now,
    }]);
    await putLocalRecords(LOCAL_DB_STORES.shoppingItems, [{
      id: "shopping",
      deviceId,
      userId: null,
      familyGroupId: null,
      name: "두부",
      quantity: "1모",
      category: "유제품",
      checked: false,
      sourceRecipeId: null,
      sourceRecipeName: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: "synced",
      lastSyncedAt: now,
    }]);
    await putLocalRecords(LOCAL_DB_STORES.favoriteRecipes, [{
      id: "favorite",
      deviceId,
      userId: null,
      name: "김치볶음밥",
      category: "밥",
      thumbnailUrl: null,
      savedAt: now,
    }]);
    await putLocalRecords(LOCAL_DB_STORES.fridgeEvents, [{
      id: "event",
      deviceId,
      userId: null,
      ingredientId: "ingredient",
      action: "create",
      payloadJson: JSON.stringify({ id: "ingredient", deviceId, userId: null }),
      createdAt: now,
    }]);
    await putLocalRecords(LOCAL_DB_STORES.pendingSyncQueue, [{
      id: "ingredients:ingredient",
      tableName: LOCAL_DB_STORES.ingredients,
      recordId: "ingredient",
      action: "create",
      payloadJson: JSON.stringify({ id: "ingredient", deviceId, userId: null }),
      retryCount: 2,
      lastError: "legacy collision",
      createdAt: now,
      updatedAt: now,
    }]);

    const result = await migrateDeviceData({ deviceId, userId });
    assert.equal(result.localMigratedCount, 5);
    assert.equal(result.totalMigratedCount, 5);
    assert.equal(result.remoteMigrationMode, "signed_session_sync");

    const ingredientRows = await readAllFromStore<{
      id: string;
      userId: string | null;
      syncStatus: string;
      lastSyncedAt: string | null;
    }>(LOCAL_DB_STORES.ingredients);
    assert.equal(ingredientRows[0]?.userId, userId);
    assert.notEqual(ingredientRows[0]?.id, "ingredient");
    assert.equal(ingredientRows[0]?.syncStatus, "pending_create");
    assert.equal(ingredientRows[0]?.lastSyncedAt, null);

    const shoppingRows = await readAllFromStore<{
      id: string;
      userId: string | null;
      syncStatus: string;
      lastSyncedAt: string | null;
    }>(LOCAL_DB_STORES.shoppingItems);
    assert.equal(shoppingRows[0]?.userId, userId);
    assert.notEqual(shoppingRows[0]?.id, "shopping");
    assert.equal(shoppingRows[0]?.syncStatus, "pending_create");
    assert.equal(shoppingRows[0]?.lastSyncedAt, null);

    const favoriteRows = await readAllFromStore<{ id: string; userId: string | null }>(
      LOCAL_DB_STORES.favoriteRecipes,
    );
    assert.equal(favoriteRows[0]?.id, "favorite");
    assert.equal(favoriteRows[0]?.userId, userId);

    const eventRows = await readAllFromStore<{
      id: string;
      userId: string | null;
      ingredientId: string;
      payloadJson: string;
    }>(LOCAL_DB_STORES.fridgeEvents);
    assert.equal(eventRows[0]?.userId, userId);
    assert.equal(eventRows[0]?.ingredientId, ingredientRows[0]?.id);
    assert.equal(JSON.parse(eventRows[0]?.payloadJson ?? "{}").id, ingredientRows[0]?.id);

    const queueRows = await readAllFromStore<{
      id: string;
      tableName: string;
      recordId: string;
      action: string;
      retryCount: number;
      lastError: string | null;
      payloadJson: string;
    }>(
      LOCAL_DB_STORES.pendingSyncQueue,
    );
    assert.equal(queueRows.length, 2);
    const ingredientQueue = queueRows.find((entry) => entry.tableName === LOCAL_DB_STORES.ingredients);
    const shoppingQueue = queueRows.find((entry) => entry.tableName === LOCAL_DB_STORES.shoppingItems);
    assert.equal(ingredientQueue?.recordId, ingredientRows[0]?.id);
    assert.equal(ingredientQueue?.id, `${LOCAL_DB_STORES.ingredients}:${ingredientRows[0]?.id}`);
    assert.equal(ingredientQueue?.action, "create");
    assert.equal(ingredientQueue?.retryCount, 0);
    assert.equal(ingredientQueue?.lastError, null);
    assert.equal(JSON.parse(ingredientQueue?.payloadJson ?? "{}").userId, userId);
    assert.equal(JSON.parse(ingredientQueue?.payloadJson ?? "{}").id, ingredientRows[0]?.id);
    assert.equal(shoppingQueue?.recordId, shoppingRows[0]?.id);
    assert.equal(JSON.parse(shoppingQueue?.payloadJson ?? "{}").id, shoppingRows[0]?.id);
    assert.equal(JSON.parse(shoppingQueue?.payloadJson ?? "{}").userId, userId);

    const secondResult = await migrateDeviceData({ deviceId, userId });
    assert.equal(secondResult.localMigratedCount, 0);
    const secondIngredientRows = await readAllFromStore<{ id: string }>(LOCAL_DB_STORES.ingredients);
    const secondShoppingRows = await readAllFromStore<{ id: string }>(LOCAL_DB_STORES.shoppingItems);
    assert.equal(secondIngredientRows[0]?.id, ingredientRows[0]?.id);
    assert.equal(secondShoppingRows[0]?.id, shoppingRows[0]?.id);
  } finally {
    await Promise.all(stores.map((store) => clearLocalStore(store)));
  }
});
