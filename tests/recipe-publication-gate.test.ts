import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  filterPublicationApprovedRecipes,
  isDatabaseRecipePublicationApproved,
  isRecipePublicationEvidenceApproved,
  isRecipePublicationApproved,
  toRecipePublicationEvidence,
  type DatabaseRecipePublicationRow,
} from "../lib/recipe-publication.ts";
import { APPSTORE_DEMO_RECIPES } from "../lib/demo-state.ts";
import type { RecipeRecord } from "../types/index.ts";

const timestamp = "2026-07-10T00:00:00.000Z";
const approvedRow: DatabaseRecipePublicationRow = {
  title: "검수 레시피",
  description: "실제 조리 검수를 마친 레시피",
  category: "밥",
  difficulty: 1,
  servings_base: 1,
  prep_time_minutes: 5,
  cook_time_minutes: 10,
  total_time_minutes: 15,
  thumbnail_url: "/images/approved.png",
  tools: [{ name: "프라이팬" }],
  ingredients: [
    { name: "밥", amount: "200g" },
    { name: "계란", amount: "1개" },
    { name: "간장", amount: "1작은술" },
  ],
  steps: [1, 2, 3].map((order) => ({
    order,
    instruction: `${order}단계`,
    heatLevel: order === 1 ? "none" : "medium",
    durationSecondsMin: 30,
    visualCue: "표면 상태를 확인",
  })),
  storage_guide: "식힌 뒤 밀폐해 냉장 보관",
  reheating_guide: "가운데까지 뜨거워지도록 재가열",
  source_id: "00000000-0000-4000-8000-000000000001",
  review_status: "approved",
  reviewed_for_beginner: true,
  beginner_reviewed_at: timestamp,
  actual_cooking_tested: true,
  actual_cooking_tested_at: timestamp,
  food_safety_reviewed: true,
  food_safety_reviewed_at: timestamp,
  image_rights_status: "approved",
  image_rights_reviewed_at: timestamp,
  source_reviewed_at: timestamp,
  published_at: timestamp,
  reviewer: "reviewer-1",
};

function recipeRecordFromRow(row: DatabaseRecipePublicationRow): RecipeRecord {
  return {
    id: "approved-recipe",
    name: String(row.title),
    category: String(row.category),
    method: "볶기",
    calories: "-",
    thumbnailUrl: String(row.thumbnail_url),
    ingredients: "밥, 계란, 간장",
    hashTag: "",
    publicationEvidence: toRecipePublicationEvidence(row),
  };
}

test("database publication gate accepts only a complete reviewed recipe", () => {
  assert.equal(isDatabaseRecipePublicationApproved(approvedRow), true);
  assert.ok(toRecipePublicationEvidence(approvedRow));

  for (const field of [
    "source_id",
    "beginner_reviewed_at",
    "actual_cooking_tested_at",
    "food_safety_reviewed_at",
    "image_rights_reviewed_at",
    "source_reviewed_at",
    "published_at",
    "reviewer",
  ] as const) {
    assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, [field]: null }), false, field);
  }
});

test("database publication gate rejects incomplete content and unreviewed evidence", () => {
  assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, reviewed_for_beginner: false }), false);
  assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, actual_cooking_tested: false }), false);
  assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, food_safety_reviewed: false }), false);
  assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, ingredients: [] }), false);
  assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, steps: [] }), false);
  assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, tools: [] }), false);
  assert.equal(isDatabaseRecipePublicationApproved({ ...approvedRow, thumbnail_url: null }), false);
  assert.equal(
    isDatabaseRecipePublicationApproved({ ...approvedRow, thumbnail_url: null, image_rights_status: "no_image_approved" }),
    true,
  );
});

test("client publication gate drops legacy, cached, and local records without evidence", () => {
  const approved = recipeRecordFromRow(approvedRow);
  const unverified = { ...approved, id: "unverified", publicationEvidence: null };
  assert.equal(isRecipePublicationApproved(approved), true);
  assert.equal(isRecipePublicationApproved(unverified), false);
  assert.equal(isRecipePublicationEvidenceApproved(approved.publicationEvidence), true);
  assert.equal(isRecipePublicationEvidenceApproved(null), false);
  assert.deepEqual(filterPublicationApprovedRecipes([unverified, approved]).map((recipe) => recipe.id), ["approved-recipe"]);
});

test("App Store demo recipes cannot bypass the publication gate", () => {
  assert.ok(APPSTORE_DEMO_RECIPES.length > 0);
  assert.deepEqual(filterPublicationApprovedRecipes(APPSTORE_DEMO_RECIPES), []);
});

test("database and application surfaces contain the P0 publication boundary", () => {
  const migration = readFileSync("supabase/migrations/20260710130000_gate_recipe_publication.sql", "utf8");
  const rollback = readFileSync("supabase/rollbacks/20260710130000_gate_recipe_publication.sql", "utf8");
  const apiRoute = readFileSync("app/api/recipes/route.ts", "utf8");
  const detailPage = readFileSync("app/recipe/[id]/page.tsx", "utf8");
  const recipeHook = readFileSync("hooks/useRecipes.ts", "utf8");
  const homePage = readFileSync("app/page.tsx", "utf8");
  const listPage = readFileSync("app/recipe/page.tsx", "utf8");
  const favoritesHook = readFileSync("hooks/useFavorites.ts", "utf8");

  assert.match(migration, /review_status = 'approved'/);
  assert.match(migration, /actual_cooking_tested is true/);
  assert.match(migration, /food_safety_reviewed is true/);
  assert.match(migration, /source_id is not null/);
  assert.match(migration, /create index if not exists idx_recipes_publication_ready/);
  assert.match(migration, /jsonb_array_elements\(ingredients\)/);
  assert.match(migration, /step\.value ->> 'visualCue'/);
  assert.match(migration, /step\.value ->> 'durationSecondsMin'/);
  assert.doesNotMatch(migration, /recipes_select_public[\s\S]{0,120}using \(true\)/);
  assert.match(migration, /recipes\.source_id = recipe_sources\.id/);
  assert.match(rollback, /recipes_select_public[\s\S]*using \(false\)/);
  assert.match(rollback, /recipe_sources_select_public[\s\S]*using \(false\)/);
  assert.doesNotMatch(apiRoute, /MFDS_API_KEY|FOODSAFETY_API_KEY|COOKRCP01/);
  assert.match(apiRoute, /code: 'NO-PUBLISHED-RECIPES'/);
  assert.match(apiRoute, /isDatabaseRecipePublicationApproved/);
  assert.match(detailPage, /isRecipeDetailPublicationApproved/);
  assert.match(detailPage, /min-h-full bg-\[#fbf6ee\] px-5 py-10/);
  assert.doesNotMatch(detailPage, /MFDS_API_KEY|FOODSAFETY_API_KEY/);
  assert.doesNotMatch(detailPage, /재료를 깨끗하게 손질하고 필요한 양을 준비합니다/);
  assert.match(recipeHook, /filterPublicationApprovedRecipes/);
  assert.match(homePage, /filterPublicationApprovedRecipes\([\s\S]{0,120}APPSTORE_DEMO_RECIPES/);
  assert.match(listPage, /filterPublicationApprovedRecipes\(isAppStoreDemo \? APPSTORE_DEMO_RECIPES : recipes\)/);
  assert.match(favoritesHook, /isRecipePublicationEvidenceApproved\(favorite\.publicationEvidence\)/);
});
