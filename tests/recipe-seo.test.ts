import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailPage = readFileSync("app/recipe/[id]/page.tsx", "utf8");

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
