import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("FE-016 registers the recipe offline worker and exposes a bounded offline status", () => {
  const layout = source("app/layout.tsx");
  const support = source("components/app/RecipeOfflineSupport.tsx");
  const offline = source("public/offline.html");

  assert.match(layout, /RecipeOfflineSupport/);
  assert.match(support, /navigator\.serviceWorker\.register\(['"]\/sw\.js['"]/);
  assert.match(support, /updateViaCache:\s*['"]none['"]/);
  assert.match(support, /CACHE_RECIPE/);
  assert.match(support, /오프라인 모드/);
  assert.match(support, /role="status"/);
  assert.match(offline, /열어본 레시피/);
  assert.match(offline, /네트워크 연결/);
});

test("FE-016 caches only public recipe documents and same-origin immutable assets", () => {
  const worker = source("public/sw.js");

  assert.match(worker, /RECIPE_PATH_PATTERN\s*=\s*\/\^\\\/recipe\\\//);
  assert.match(worker, /request\.method !== ['"]GET['"]/);
  assert.match(worker, /request\.headers\.has\(['"]Authorization['"]\)/);
  assert.match(worker, /credentials:\s*['"]omit['"]/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /response\.ok/);
  assert.match(worker, /content-type/);
  assert.match(worker, /MAX_RECIPE_ENTRIES/);
  assert.match(worker, /MAX_ASSET_ENTRIES/);
  assert.match(worker, /MAX_DISCOVERED_ASSETS/);
  assert.match(worker, /SHELL_CACHE/);
  assert.match(worker, /response\.clone\(\)\.text\(\)/);
  assert.match(worker, /Promise\.allSettled/);
  assert.match(worker, /offline\.html/);
  assert.doesNotMatch(worker, /['"]\/(?:fridge|shopping|mypage|family)['"]/);
  assert.doesNotMatch(worker, /\/api\/v1\/recipe-feedback/);
});

test("FE-016 keeps progress, timers, fridge, and shopping writes in existing local-first stores", () => {
  const cookMode = source("components/recipe/RecipeCookMode.tsx");
  const cookProgress = source("lib/recipe-cook-progress.ts");
  const localDatabase = source("lib/local-db/schema.ts");

  assert.match(cookMode, /window\.localStorage\.setItem\(storageKey/);
  assert.match(cookProgress, /endsAt/);
  assert.match(localDatabase, /ingredients/);
  assert.match(localDatabase, /shoppingItems/);
  assert.match(localDatabase, /pendingSyncQueue/);
});
