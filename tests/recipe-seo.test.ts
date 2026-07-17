import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailPage = readFileSync("app/recipe/[id]/page.tsx", "utf8");
const ingredientIndexPage = readFileSync("app/ingredients/page.tsx", "utf8");
const ingredientDetailPage = readFileSync("app/ingredients/[id]/page.tsx", "utf8");
const guideIndexPage = readFileSync("app/guides/page.tsx", "utf8");
const guideDetailPage = readFileSync("app/guides/[slug]/page.tsx", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");

test("public recipe detail exposes dynamic metadata and Recipe structured data", () => {
  assert.match(detailPage, /export async function generateMetadata/);
  assert.match(detailPage, /isRecipeDetailPublicationApproved/);
  assert.match(detailPage, /alternates: \{ canonical \}/);
  assert.match(detailPage, /robots: \{ index: false, follow: false \}/);
  assert.match(detailPage, /"@type": "Recipe"/);
  assert.match(detailPage, /"@type": "HowToStep"/);
  assert.match(detailPage, /type="application\/ld\+json"/);
  assert.match(detailPage, /replace\(\/<\/g, "\\\\u003c"\)/);
});

test("ingredient and beginner guide landing pages expose canonical metadata", () => {
  assert.match(ingredientIndexPage, /alternates: \{ canonical: "\/ingredients" \}/);
  assert.match(ingredientDetailPage, /generateStaticParams/);
  assert.match(ingredientDetailPage, /type="application\/ld\+json"/);
  assert.match(ingredientDetailPage, /\/recipe\?ingredient=/);
  assert.match(guideIndexPage, /alternates: \{ canonical: "\/guides" \}/);
  assert.match(guideDetailPage, /"@type": "Article"/);
  assert.match(guideDetailPage, /robots: \{ index: false, follow: false \}/);
});

test("sitemap includes ingredient and guide landing catalogs", () => {
  assert.match(sitemap, /getIngredientCatalog/);
  assert.match(sitemap, /getCookingGuides/);
  assert.match(sitemap, /\/ingredients\/\$\{item\.id\}/);
  assert.match(sitemap, /\/guides\/\$\{guide\.slug\}/);
});
