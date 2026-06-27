import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
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

test("every generated imagegen poster on disk is mapped into curated recipes", () => {
  const mappedSlugs = new Set(getMappedImagegenPosterSlugs());

  for (const slug of getImagegenPosterSlugsOnDisk()) {
    assert.ok(mappedSlugs.has(slug), `${slug}.png exists but is not exposed through recipePosterImageUrl`);
  }
});

test("mapped imagegen poster paths point to local png assets", () => {
  for (const recipe of CURATED_JIPBAB_RECIPES) {
    const slug = recipe.slug;
    if (
      typeof slug !== "string" ||
      !slug.startsWith("beginner-") ||
      !recipe.recipePosterImageUrl?.startsWith(IMAGEGEN_POSTER_PUBLIC_PREFIX)
    ) {
      continue;
    }

    assert.equal(recipe.recipePosterImageUrl, `${IMAGEGEN_POSTER_PUBLIC_PREFIX}${slug}.png`);
    assert.ok(
      existsSync(join(process.cwd(), "public", recipe.recipePosterImageUrl)),
      `${slug} is mapped to a missing imagegen poster`,
    );
  }
});
