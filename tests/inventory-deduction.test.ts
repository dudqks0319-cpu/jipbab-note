import assert from "node:assert/strict";
import test from "node:test";

import { calculateInventoryDeduction } from "../lib/inventory-deduction.ts";

test("deducts compatible metric quantities and preserves the inventory unit", () => {
  const result = calculateInventoryDeduction("1kg", "250g");
  assert.equal(result.status, "adjusted");
  assert.equal(result.nextQuantity, "0.75kg");
  assert.equal(result.usedQuantity, "250g");
});

test("marks an item consumed when the recipe uses the remaining quantity", () => {
  const result = calculateInventoryDeduction("2개", "2개");
  assert.equal(result.status, "consumed");
  assert.equal(result.nextQuantity, "0개");
});

test("fails closed for incompatible, unstructured, or insufficient quantities", () => {
  assert.equal(calculateInventoryDeduction("2개", "100g").status, "incompatible");
  assert.equal(calculateInventoryDeduction("조금", "1개").status, "unstructured");
  assert.equal(calculateInventoryDeduction("1개", "2개").status, "insufficient");
});

test("supports recipe-style number-before-spoon displays", () => {
  const result = calculateInventoryDeduction("큰술 3", "1큰술");
  assert.equal(result.status, "adjusted");
  assert.equal(result.nextQuantity, "큰술 2");
});
