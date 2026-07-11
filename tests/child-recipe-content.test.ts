import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the 24-36 month draft content passes the child safety validator", () => {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/validate-child-recipes.mjs"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: process.env,
    },
  );

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );
  assert.match(result.stdout, /12 draft recipes/);
});
