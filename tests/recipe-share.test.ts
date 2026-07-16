import assert from "node:assert/strict";
import test from "node:test";

import { buildRecipeSharePath, buildRecipeShareUrl } from "../lib/recipe-share.ts";

test("recipe share routes stay inside the approved detail or preview surface", () => {
  assert.equal(buildRecipeSharePath("recipe-123"), "/recipe/recipe-123");
  assert.equal(
    buildRecipeSharePath("beginner-recipe-028", "preview"),
    "/recipe/preview/beginner-recipe-028",
  );
  assert.equal(
    buildRecipeShareUrl("https://jipbab.example", "beginner-recipe-028", "preview"),
    "https://jipbab.example/recipe/preview/beginner-recipe-028",
  );
});

test("recipe share rejects path traversal and non-http origins", () => {
  assert.throws(() => buildRecipeSharePath("../admin"), /레시피 ID/);
  assert.throws(() => buildRecipeSharePath("recipe 123"), /레시피 ID/);
  assert.throws(
    () => buildRecipeShareUrl("javascript:alert(1)", "recipe-123"),
    /공유 주소/,
  );
});
