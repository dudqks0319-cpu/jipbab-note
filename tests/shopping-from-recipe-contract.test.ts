import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("API-005 route is signed-session only, bounded, rate limited, and user scoped", () => {
  const route = source("app/api/v1/shopping/items/from-recipe/route.ts");

  for (const contract of [
    'createApiV1Responder("POST /api/v1/shopping/items/from-recipe")',
    'consumeDistributedRateLimit(request, "shopping:from-recipe"',
    "readBoundedJsonObject(request, MAX_BODY_BYTES)",
    "getBearerAccessToken(authorizationHeader)",
    "getAuthenticatedServerUser(authorizationHeader)",
    "getPublicRecipeDetailV1(input.recipeId)",
    'getServerSupabaseAdminClient()',
    '.from("shopping_items")',
    '.eq("user_id", user.id)',
    '.is("family_group_id", null)',
    "buildShoppingFromRecipeCandidates",
    "buildShoppingFromRecipeUpserts",
  ]) {
    assert.ok(route.includes(contract), `missing route contract: ${contract}`);
  }

  assert.doesNotMatch(route, /console\.|x-device-id|SUPABASE_SERVICE_ROLE_KEY|error\.stack/);
});

test("API-005 parser does not accept client-authored names, quantities, users, or scopes", () => {
  const parser = source("lib/shopping-from-recipe.ts");

  assert.match(parser, /const INPUT_KEYS = \[/);
  assert.match(parser, /MAX_SELECTED_INGREDIENTS = 50/);
  assert.match(parser, /selectedIngredientIds/);
  assert.doesNotMatch(
    parser.match(/const INPUT_KEYS = \[([\s\S]*?)\] as const;/)?.[1] ?? "",
    /name|quantity|user|device|family|category/i,
  );
});

test("API-005 is included in telemetry and repeatable API contract checks", () => {
  const telemetry = source("lib/operational-telemetry.ts");
  const checker = source("scripts/check-api-v1-contract.mjs");

  assert.match(telemetry, /POST \/api\/v1\/shopping\/items\/from-recipe/);
  assert.match(checker, /shopping\/items\/from-recipe\/route\.ts/);
  assert.match(checker, /shopping-from-recipe\.test\.ts/);
  assert.match(checker, /shopping-from-recipe-contract\.test\.ts/);
});
