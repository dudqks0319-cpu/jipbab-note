import assert from "node:assert/strict";
import test from "node:test";

import { formatIngredientQuantity } from "../lib/measurements.ts";

test("formats metric quantities in metric mode", () => {
  const display = formatIngredientQuantity(
    {
      amountValue: 500,
      amountUnit: "ml",
      quantityDisplay: null,
    },
    "metric",
  );

  assert.equal(display, "500ml");
});

test("formats spoon quantities in spoon mode", () => {
  const display = formatIngredientQuantity(
    {
      amountValue: 2,
      amountUnit: "tbsp",
      quantityDisplay: null,
    },
    "spoon",
  );

  assert.equal(display, "큰술 2");
});

test("falls back to saved display text when structured data is missing", () => {
  const display = formatIngredientQuantity(
    {
      amountValue: null,
      amountUnit: null,
      quantityDisplay: "반 봉",
    },
    "count",
  );

  assert.equal(display, "반 봉");
});
