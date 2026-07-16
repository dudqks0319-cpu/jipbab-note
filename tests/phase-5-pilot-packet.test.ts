import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const source = readFileSync("scripts/prepare-phase-5-pilot-packet.mjs", "utf8");

test("Phase 5 pilot packet command is wired and pins five Wave 1A recipes", () => {
  assert.equal(
    packageJson.scripts["phase5:prepare-pilot"],
    "node --experimental-strip-types scripts/prepare-phase-5-pilot-packet.mjs",
  );
  assert.match(source, /beginner-recipe-001/);
  assert.match(source, /beginner-recipe-016/);
  assert.match(source, /beginner-recipe-013/);
  assert.match(source, /beginner-recipe-002/);
  assert.match(source, /beginner-recipe-006/);
});

test("pilot packet hashes recipe content without promoting human or database status", () => {
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /PHASE5_APP_BUILD_SHA/);
  assert.match(source, /git", \["cat-file", "-e"/);
  assert.match(source, /humanEvidenceStatus: "pending"/);
  assert.match(source, /no CSV or database approval was changed/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /status:\s*"approved"/);
});
