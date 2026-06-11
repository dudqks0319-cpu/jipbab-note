import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { BEGINNER_RECIPE_LIBRARY } from "../lib/beginner-recipes.ts";
import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";

const SCENE_DIR = join(process.cwd(), "public/images/recipes/beginner-scenes");
const MANIFEST_PATH = join(SCENE_DIR, "manifest.json");
const FOOD_PHOTO_PREFIX = "/images/recipes/beginner-food-photos/";

type BeginnerSceneManifest = {
  count: number;
  assets: Array<{
    recipeId: string;
    recipeSlug: string;
    coverPath: string;
    ingredientsPath: string;
    toolsPath: string;
    sceneCount: number;
    scenes: Array<{
      kind: "cover" | "ingredients" | "tools" | "step";
      order?: number;
      path: string;
    }>;
    rights: {
      originalGenerated: boolean;
      noExternalPhoto: boolean;
      noBrandLogo: boolean;
      noCharacter: boolean;
      noCompetitorAsset: boolean;
    };
    qa: {
      perStepImage: boolean;
      mobileLegible: boolean;
      beginnerSafe: boolean;
    };
  }>;
};

const loadManifest = (): BeginnerSceneManifest =>
  JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as BeginnerSceneManifest;

test("beginner recipe scene manifest covers cover, ingredients, tools, and every step", () => {
  const manifest = loadManifest();
  const assetById = new Map(manifest.assets.map((asset) => [asset.recipeId, asset]));

  assert.equal(manifest.count, BEGINNER_RECIPE_LIBRARY.length);
  assert.ok(manifest.count >= 100);

  for (const recipe of BEGINNER_RECIPE_LIBRARY) {
    const asset = assetById.get(recipe.id);
    assert.ok(asset, `${recipe.id} missing from scene manifest`);
    assert.equal(asset.sceneCount, recipe.steps.length + 3, recipe.id);
    assert.equal(asset.scenes.filter((scene) => scene.kind === "step").length, recipe.steps.length, recipe.id);
    assert.ok(asset.coverPath.endsWith("/cover.svg"), recipe.id);
    assert.ok(asset.ingredientsPath.endsWith("/ingredients.svg"), recipe.id);
    assert.ok(asset.toolsPath.endsWith("/tools.svg"), recipe.id);
  }
});

test("beginner recipe scene assets exist and keep release-safe rights metadata", () => {
  const manifest = loadManifest();

  for (const asset of manifest.assets) {
    for (const scene of asset.scenes) {
      assert.ok(existsSync(join(process.cwd(), "public", scene.path)), `${asset.recipeId} missing ${scene.path}`);
      assert.ok(scene.path.startsWith(`/images/recipes/beginner-scenes/${asset.recipeSlug}/`), scene.path);
      assert.ok(scene.path.endsWith(".svg"), scene.path);
    }
    assert.deepEqual(asset.rights, {
      originalGenerated: true,
      noExternalPhoto: true,
      noBrandLogo: true,
      noCharacter: true,
      noCompetitorAsset: true,
    });
    assert.equal(asset.qa.perStepImage, true, asset.recipeId);
    assert.equal(asset.qa.mobileLegible, true, asset.recipeId);
    assert.equal(asset.qa.beginnerSafe, true, asset.recipeId);
  }
});

test("curated beginner recipes keep scene step images and may use food-photo thumbnails", () => {
  const manifest = loadManifest();
  const coverPaths = new Set(manifest.assets.map((asset) => asset.coverPath));
  const stepPaths = new Set(manifest.assets.flatMap((asset) => asset.scenes.filter((scene) => scene.kind === "step").map((scene) => scene.path)));

  for (const recipe of CURATED_JIPBAB_RECIPES.filter((item) => item.id.startsWith("beginner-recipe-"))) {
    assert.ok(recipe.thumbnailUrl, recipe.id);
    if (recipe.thumbnailUrl.startsWith(FOOD_PHOTO_PREFIX)) {
      assert.ok(existsSync(join(process.cwd(), "public", recipe.thumbnailUrl)), `${recipe.id} missing ${recipe.thumbnailUrl}`);
    } else {
      assert.ok(recipe.thumbnailUrl.startsWith("/images/recipes/beginner-scenes/"), `${recipe.id} uses ${recipe.thumbnailUrl}`);
      assert.ok(coverPaths.has(recipe.thumbnailUrl), `${recipe.id} missing cover path`);
    }
    assert.ok(recipe.steps.length >= 4, recipe.id);
    for (const step of recipe.steps) {
      assert.ok(step.imageUrl, `${recipe.id} step ${step.index} missing imageUrl`);
      assert.ok(stepPaths.has(step.imageUrl), `${recipe.id} missing ${step.imageUrl}`);
    }
  }
});

test("package exposes a repeatable scene generation command", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.["recipes:scenes:generate"],
    "node --experimental-strip-types scripts/generate-beginner-recipe-scenes.mjs",
  );
});
