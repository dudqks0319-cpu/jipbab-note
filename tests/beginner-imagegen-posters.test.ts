import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import test from "node:test";

import { CURATED_JIPBAB_RECIPES } from "../lib/curated-recipes.ts";

const IMAGEGEN_POSTER_DIR = join(process.cwd(), "public/images/recipes/beginner-imagegen-posters");
const IMAGEGEN_POSTER_PUBLIC_PREFIX = "/images/recipes/beginner-imagegen-posters/";

function getImagegenPosterSlugsOnDisk(): string[] {
  return readdirSync(IMAGEGEN_POSTER_DIR)
    .filter((fileName) => fileName.endsWith(".png"))
    .map((fileName) => basename(fileName, ".png"))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function getMappedImagegenPosterSlugs(): string[] {
  const slugs: string[] = [];

  for (const recipe of CURATED_JIPBAB_RECIPES) {
    const slug = recipe.slug;
    if (
      typeof slug === "string" &&
      slug.startsWith("beginner-") &&
      recipe.recipePosterImageUrl?.startsWith(IMAGEGEN_POSTER_PUBLIC_PREFIX)
    ) {
      slugs.push(slug);
    }
  }

  return slugs.sort((left, right) => left.localeCompare(right, "en"));
}

test("generated imagegen poster assets stay unexposed until instruction imagery is verified", () => {
  const diskSlugs = getImagegenPosterSlugsOnDisk();

  assert.ok(diskSlugs.length > 0, "expected generated poster assets to remain archived on disk");
  assert.deepEqual(getMappedImagegenPosterSlugs(), []);
});

test("beginner recipes do not expose imagegen poster paths while step visuals are disabled", () => {
  for (const recipe of CURATED_JIPBAB_RECIPES) {
    const slug = recipe.slug;
    if (typeof slug !== "string" || !slug.startsWith("beginner-")) {
      continue;
    }

    assert.equal(recipe.recipePosterImageUrl, null, `${slug} should not expose an unverified imagegen poster`);
  }
});
