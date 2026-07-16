import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { BEGINNER_RECIPE_LIBRARY } from "../lib/beginner-recipes.ts";

const POSTER_DIR = join(process.cwd(), "public/images/recipes/beginner-posters");
const MANIFEST_PATH = join(POSTER_DIR, "manifest.json");

type BeginnerPosterManifest = {
  count: number;
  assets: Array<{
    recipeId: string;
    recipeSlug: string;
    path: string;
    rights: {
      originalGenerated: boolean;
      noExternalPhoto: boolean;
      noBrandLogo: boolean;
      noCharacter: boolean;
      noCompetitorAsset: boolean;
    };
    qa: {
      textReadable: boolean;
      recipeMatch: boolean;
      beginnerSafe: boolean;
      mobileLegible: boolean;
    };
  }>;
};

const loadManifest = (): BeginnerPosterManifest =>
  JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as BeginnerPosterManifest;

test("beginner recipe poster manifest covers the full BeginnerRecipe library", () => {
  const manifest = loadManifest();
  const assetIds = new Set(manifest.assets.map((asset) => asset.recipeId));

  assert.equal(manifest.count, BEGINNER_RECIPE_LIBRARY.length);
  assert.ok(manifest.count >= 100);

  for (const recipe of BEGINNER_RECIPE_LIBRARY) {
    assert.ok(assetIds.has(recipe.id), `${recipe.id} missing from poster manifest`);
  }
});

test("beginner recipe poster assets exist and keep release-safe rights metadata", () => {
  const manifest = loadManifest();

  for (const asset of manifest.assets) {
    assert.ok(
      existsSync(join(process.cwd(), "public", asset.path)),
      `${asset.recipeId} missing ${asset.path}`,
    );
    assert.ok(asset.path.endsWith("__v001__16x9__ko-KR.svg"), asset.recipeId);
    assert.deepEqual(asset.rights, {
      originalGenerated: true,
      noExternalPhoto: true,
      noBrandLogo: true,
      noCharacter: true,
      noCompetitorAsset: true,
    });
    assert.equal(asset.qa.textReadable, true, asset.recipeId);
    assert.equal(asset.qa.recipeMatch, true, asset.recipeId);
    assert.equal(asset.qa.beginnerSafe, true, asset.recipeId);
    assert.equal(asset.qa.mobileLegible, true, asset.recipeId);
  }
});

test("beginner recipe poster assets remain available as fallback thumbnails", () => {
  const manifestPaths = new Set(loadManifest().assets.map((asset) => asset.path));

  for (const recipe of BEGINNER_RECIPE_LIBRARY) {
    const expectedPath = `/images/recipes/beginner-posters/recipe-poster__${recipe.slug}__v001__16x9__ko-KR.svg`;
    assert.ok(manifestPaths.has(expectedPath), `${recipe.id} missing fallback poster`);
  }
});

test("package exposes a repeatable poster generation command", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.["recipes:posters:generate"],
    "node --experimental-strip-types scripts/generate-beginner-recipe-posters.mjs",
  );
});
