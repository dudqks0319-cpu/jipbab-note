import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Next tracing root decodes mounted paths with spaces", () => {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(config, /fileURLToPath\(import\.meta\.url\)/);
  assert.doesNotMatch(config, /new URL\(import\.meta\.url\)\.pathname/);
});
