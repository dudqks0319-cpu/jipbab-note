import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BEGINNER_RECIPE_POSTER_PATH_PREFIX,
  isBeginnerRecipePosterImage,
} from "../lib/recipe-images.ts";

test("beginner recipe poster image detection is scoped to generated poster assets", () => {
  assert.equal(BEGINNER_RECIPE_POSTER_PATH_PREFIX, "/images/recipes/beginner-posters/");
  assert.equal(
    isBeginnerRecipePosterImage(
      "/images/recipes/beginner-posters/recipe-poster__beginner-001__v001__16x9__ko-KR.svg",
    ),
    true,
  );
  assert.equal(isBeginnerRecipePosterImage("/images/recipes/jipbab-curated/soy-egg-rice.png"), false);
  assert.equal(isBeginnerRecipePosterImage("https://example.com/recipe-poster.svg"), false);
  assert.equal(isBeginnerRecipePosterImage(null), false);
});

test("beginner poster images render contained instead of cropped on mobile recipe surfaces", () => {
  const homeSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const listSource = readFileSync(new URL("../app/recipe/page.tsx", import.meta.url), "utf8");
  const detailSource = readFileSync(new URL("../app/recipe/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(homeSource, /isBeginnerRecipePosterImage/);
  assert.match(homeSource, /object-contain p-1/);
  assert.match(listSource, /isBeginnerRecipePosterImage/);
  assert.match(listSource, /object-contain p-1/);
  assert.match(detailSource, /isBeginnerRecipePosterImage/);
  assert.match(detailSource, /object-contain p-2/);
});
