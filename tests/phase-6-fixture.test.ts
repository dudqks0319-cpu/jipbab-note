import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createPhase6E2EFixtureSession,
  PHASE6_E2E_FIXTURE_COOKIE,
  PHASE6_E2E_FIXTURE_RECIPE_ID,
  getPhase6E2EFixtureDetail,
  listPhase6E2EFixtureRecipes,
  shouldUsePhase6E2EFixture,
} from "../lib/phase-6-e2e-fixture.ts";

const fixtureEnvironment = {
  APP_ENV: "staging",
  PHASE6_E2E_FIXTURE_ENABLED: "true",
  PHASE6_E2E_FIXTURE_TOKEN: "fixture-secret",
};
const now = Date.UTC(2026, 6, 14);

test("Phase 6 fixture requires an explicit staging token and fails closed in production", () => {
  const session = createPhase6E2EFixtureSession(
    new Headers({ authorization: "Bearer fixture-secret" }),
    fixtureEnvironment,
    now,
  );
  assert.ok(session);
  const fixtureHeaders = new Headers({ cookie: `${PHASE6_E2E_FIXTURE_COOKIE}=${session}` });
  assert.equal(
    shouldUsePhase6E2EFixture(fixtureHeaders, fixtureEnvironment, now),
    true,
  );
  assert.equal(
    shouldUsePhase6E2EFixture(fixtureHeaders, {
      APP_ENV: "production",
      PHASE6_E2E_FIXTURE_ENABLED: "true",
      PHASE6_E2E_FIXTURE_TOKEN: "fixture-secret",
    }, now),
    false,
  );
  assert.equal(
    shouldUsePhase6E2EFixture(fixtureHeaders, {
      APP_ENV: "staging",
      VERCEL_ENV: "production",
      PHASE6_E2E_FIXTURE_ENABLED: "true",
      PHASE6_E2E_FIXTURE_TOKEN: "fixture-secret",
    }, now),
    false,
  );
  assert.equal(
    shouldUsePhase6E2EFixture(new Headers(), fixtureEnvironment, now),
    false,
  );
  assert.equal(
    shouldUsePhase6E2EFixture(fixtureHeaders, fixtureEnvironment, now + 11 * 60 * 1000),
    false,
  );
  assert.equal(
    createPhase6E2EFixtureSession(
      new Headers({ authorization: "Bearer wrong-secret" }),
      fixtureEnvironment,
      now,
    ),
    null,
  );
});

test("Phase 6 fixture exposes one isolated technical recipe without human-review counting", () => {
  const detail = getPhase6E2EFixtureDetail(PHASE6_E2E_FIXTURE_RECIPE_ID);

  assert.ok(detail);
  assert.equal(detail.isTestFixture, true);
  assert.equal(detail.publicationEvidence.reviewStatus, "approved");
  assert.equal(detail.ingredients.length, 4);
  assert.equal(detail.steps.length, 3);
  assert.deepEqual(detail.steps.map((step) => step.durationSeconds.timerPreset), [30, 90, null]);
  assert.match(detail.source.attribution, /기술 E2E 전용/);
});

test("Phase 6 fixture recommendation card calculates owned and missing ingredients", () => {
  const result = listPhase6E2EFixtureRecipes({
    query: null,
    categoryId: null,
    difficulty: null,
    maxTotalTime: null,
    maxMissingIngredients: null,
    ingredientIds: ["dairy-egg", "dairy-tofu"],
    excludeIngredientIds: [],
    sort: "recommended",
    cursor: null,
    limit: 24,
  });

  assert.equal(result.recipes.length, 1);
  assert.equal(result.recipes[0]?.isTestFixture, true);
  assert.equal(result.recipes[0]?.ownedIngredientCount, 2);
  assert.deepEqual(result.recipes[0]?.missingIngredientIds, ["veg-green-onion"]);
});

test("technical fixture does not call public comments API", () => {
  const detailPage = readFileSync(new URL("../app/recipe/[id]/page.tsx", import.meta.url), "utf8");

  assert.match(detailPage, /!recipe\.isTestFixture/);
});
