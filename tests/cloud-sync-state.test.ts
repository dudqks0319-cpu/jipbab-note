import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ingredientService = readFileSync("lib/sync/ingredient-sync-service.ts", "utf8");
const shoppingService = readFileSync("lib/sync/shopping-sync-service.ts", "utf8");
const ingredientHook = readFileSync("hooks/useIngredients.ts", "utf8");
const shoppingHook = readFileSync("hooks/useShopping.ts", "utf8");
const fridgePage = readFileSync("app/fridge/page.tsx", "utf8");
const shoppingPage = readFileSync("app/shopping/page.tsx", "utf8");

test("local-only sync results are not mislabeled as Supabase success", () => {
  for (const service of [ingredientService, shoppingService]) {
    assert.match(service, /source:\s*"local"/);
    assert.match(service, /source:\s*"supabase"/);
    assert.match(service, /try\s*{\s*client = getSupabaseClient\(\)/);
  }

  assert.doesNotMatch(ingredientHook, /setSource\("supabase"\);\s*setError\(null\);\s*return synced;/);
  assert.doesNotMatch(shoppingHook, /setSource\("supabase"\);\s*setError\(null\);\s*return synced;/);
  assert.match(ingredientHook, /setSource\(result\.source\)/);
  assert.match(shoppingHook, /setSource\(result\.source\)/);
});

test("hooks expose local-only, synced, and error cloud states", () => {
  for (const hook of [ingredientHook, shoppingHook]) {
    assert.match(hook, /cloudSyncState/);
    assert.match(hook, /"local-only"/);
    assert.match(hook, /"synced"/);
    assert.match(hook, /"error"/);
  }
});

test("inventory screens distinguish local-only storage from a real sync error", () => {
  for (const page of [fridgePage, shoppingPage]) {
    assert.match(page, /cloudSyncState === 'local-only'/);
    assert.match(page, /cloudSyncState === 'error'/);
    assert.match(page, /이 기기에 안전하게 저장/);
    assert.match(page, /다른 기기에서도 이어서/);
    assert.match(page, /다시 시도/);
  }

  assert.doesNotMatch(fridgePage, /로그인\/네트워크 복구 후 클라우드 동기화 상태를 확인하세요/);
  assert.match(fridgePage, /cloudSyncState !== 'local-only' && item\.syncStatus/);
});

test("inventory screens show an accessible success state only after cloud sync settles", () => {
  for (const page of [fridgePage, shoppingPage]) {
    assert.match(
      page,
      /cloudSyncState === 'synced' && pendingSyncCount === 0/,
    );
    assert.match(page, /role="status"/);
    assert.match(page, /클라우드 동기화 완료/);
  }

  assert.match(fridgePage, /재료 변경사항을 안전하게 저장했어요/);
  assert.match(shoppingPage, /장보기와 냉장고 변경사항을 안전하게 저장했어요/);
});

test("inventory screens explain pending cloud writes without calling them an error", () => {
  for (const page of [fridgePage, shoppingPage]) {
    assert.match(page, /cloudSyncState === 'checking' && pendingSyncCount > 0/);
    assert.match(page, /aria-live="polite"/);
    assert.match(page, /클라우드에 저장 중/);
    assert.match(page, /이 기기에 먼저 저장했어요/);
    assert.match(page, /개 변경사항을 반영하고 있어요/);
  }
});
