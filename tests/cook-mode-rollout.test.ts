import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  cookModeRolloutBucket,
  resolveCookModeRollout,
} from "../lib/cook-mode-rollout.ts";

const FIRST_RECIPE_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_RECIPE_ID = "00000000-0000-4000-8000-000000000002";
const detailPage = readFileSync("app/recipe/[id]/page.tsx", "utf8");
const servingWorkspace = readFileSync("components/recipe/RecipeServingWorkspace.tsx", "utf8");
const environmentExample = readFileSync(".env.example", "utf8");

test("OPS-005 preserves the current cook mode when rollout is not configured", () => {
  assert.deepEqual(resolveCookModeRollout(FIRST_RECIPE_ID, undefined), {
    enabled: true,
    percentage: 100,
    bucket: 22,
    source: "default",
  });
});

test("OPS-005 supports explicit immediate disable and full enable", () => {
  assert.equal(resolveCookModeRollout(FIRST_RECIPE_ID, "0").enabled, false);
  assert.equal(resolveCookModeRollout(FIRST_RECIPE_ID, "100").enabled, true);
});

test("OPS-005 assigns a stable recipe-only cohort for gradual rollout", () => {
  assert.equal(cookModeRolloutBucket(FIRST_RECIPE_ID), 22);
  assert.equal(cookModeRolloutBucket(SECOND_RECIPE_ID), 3);
  assert.equal(resolveCookModeRollout(FIRST_RECIPE_ID, "20").enabled, false);
  assert.equal(resolveCookModeRollout(SECOND_RECIPE_ID, "20").enabled, true);
});

test("OPS-005 fails closed for malformed explicit rollout settings", () => {
  for (const value of ["", "-1", "101", "1.5", "20%", "on", " 20 "]) {
    assert.deepEqual(resolveCookModeRollout(FIRST_RECIPE_ID, value), {
      enabled: false,
      percentage: 0,
      bucket: 22,
      source: "invalid",
    });
  }
});

test("OPS-005 fails closed when a recipe identifier is empty", () => {
  assert.deepEqual(resolveCookModeRollout("", "100"), {
    enabled: false,
    percentage: 0,
    bucket: null,
    source: "invalid",
  });
});

test("OPS-005 keeps rollout evaluation on the server and passes only a decision to the client", () => {
  assert.match(detailPage, /resolveCookModeRollout\(recipe\.id\)/);
  assert.match(detailPage, /cookModeEnabled=\{cookModeRollout\.enabled\}/);
  assert.doesNotMatch(servingWorkspace, /process\.env|COOK_MODE_ROLLOUT_PERCENT/);
  assert.doesNotMatch(detailPage, /NEXT_PUBLIC_COOK_MODE/);
});

test("OPS-005 keeps readable instructions when interactive cook mode is disabled", () => {
  assert.match(servingWorkspace, /cookModeEnabled \?/);
  assert.match(servingWorkspace, /RecipeInstructionView/);
  assert.match(servingWorkspace, /조리 모드는 순차적으로 열고 있어요/);
  assert.match(detailPage, /cookModeRollout\.enabled \? "#cook-mode" : "#instructions"/);
});

test("OPS-005 documents the safe default rollout value", () => {
  assert.match(environmentExample, /COOK_MODE_ROLLOUT_PERCENT=100/);
});
