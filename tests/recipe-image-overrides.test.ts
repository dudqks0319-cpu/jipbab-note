import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { resolveRecipeThumbnailUrl } from "../lib/recipe-image-overrides.ts";

test("udon recipes use 집밥노트 local generated images instead of external thumbnails", () => {
  assert.equal(
    resolveRecipeThumbnailUrl("볶음우동", "https://example.com/package-label.jpg"),
    "/images/recipes/jipbab-curated/bokkeum-udon.png",
  );
  assert.equal(
    resolveRecipeThumbnailUrl("매콤 비빔 우동", "https://example.com/package-label.jpg"),
    "/images/recipes/jipbab-curated/bibim-udon.png",
  );
});

test("recipe image overrides point at existing local assets", () => {
  for (const recipeName of ["볶음우동", "비빔우동"]) {
    const thumbnailUrl = resolveRecipeThumbnailUrl(recipeName, null);

    assert.ok(thumbnailUrl, recipeName);
    assert.ok(thumbnailUrl.startsWith("/images/recipes/"), recipeName);
    assert.ok(
      existsSync(join(process.cwd(), "public", thumbnailUrl)),
      `${recipeName} missing ${thumbnailUrl}`,
    );
  }
});

test("non-overridden recipes keep their original thumbnail", () => {
  assert.equal(
    resolveRecipeThumbnailUrl("된장찌개", "https://example.com/doenjang.jpg"),
    "https://example.com/doenjang.jpg",
  );
});
