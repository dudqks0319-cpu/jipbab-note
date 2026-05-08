import assert from "node:assert/strict";
import test from "node:test";

import { parseBulkIngredientInput } from "../lib/bulk-ingredient-input.ts";

test("bulk ingredient input parses Korean shopping-style lines", () => {
  const result = parseBulkIngredientInput(`
    계란 10개
    두부 1모
    양파 2개
    김치 반통
    돼지고기 300g
  `);

  assert.equal(result.payloads.length, 5);
  assert.deepEqual(
    result.payloads.map((item) => [item.name, item.quantity, item.memo]),
    [
      ["계란", "10개", "유통기한 나중에 확인"],
      ["두부", "1모", "유통기한 나중에 확인"],
      ["양파", "2개", "유통기한 나중에 확인"],
      ["김치", "반통", "유통기한 나중에 확인"],
      ["돼지고기", "300g", "유통기한 나중에 확인"],
    ],
  );
});

test("bulk ingredient input dedupes repeated lines and supports comma input", () => {
  const result = parseBulkIngredientInput("계란 10개, 계란 6개, 우유 1팩");

  assert.equal(result.payloads.length, 2);
  assert.deepEqual(result.payloads.map((item) => item.name), ["계란", "우유"]);
  assert.equal(result.skippedLines.length, 1);
});
