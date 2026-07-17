// 이 파일은 단위가 명확한 냉장고 수량만 조리 사용량만큼 안전하게 차감합니다.
import { formatIngredientQuantity, parseQuantityDisplay } from "./measurements.ts";
import type { IngredientUnit } from "../types/index.ts";

export type InventoryDeductionStatus =
  | "adjusted"
  | "consumed"
  | "insufficient"
  | "incompatible"
  | "unstructured";

export type InventoryDeductionResult = {
  status: InventoryDeductionStatus;
  previousQuantity: string | null;
  requiredQuantity: string | null;
  usedQuantity: string | null;
  nextQuantity: string | null;
};

type CanonicalQuantity = {
  value: number;
  unit: IngredientUnit;
  canonicalValue: number;
  canonicalUnit: "g" | "ml" | IngredientUnit;
};

function canonicalQuantity(quantity: string | null | undefined): CanonicalQuantity | null {
  const parsed = parseQuantityDisplay(quantity);
  const value = Number(parsed.amountValue);
  if (!parsed.amountUnit || !Number.isFinite(value) || value < 0) return null;
  if (parsed.amountUnit === "kg") return { value, unit: "kg", canonicalValue: value * 1000, canonicalUnit: "g" };
  if (parsed.amountUnit === "l") return { value, unit: "l", canonicalValue: value * 1000, canonicalUnit: "ml" };
  return { value, unit: parsed.amountUnit, canonicalValue: value, canonicalUnit: parsed.amountUnit };
}

function fromCanonical(value: number, originalUnit: IngredientUnit): number {
  if (originalUnit === "kg" || originalUnit === "l") return value / 1000;
  return value;
}

function display(value: number, unit: IngredientUnit, source: string | null | undefined): string {
  return formatIngredientQuantity(
    { amountValue: value, amountUnit: unit, quantityDisplay: null },
    /^(큰술|작은술|컵)/.test(source?.trim() ?? "") ? "spoon" : "metric",
  );
}

export function calculateInventoryDeduction(
  inventoryQuantity: string | null | undefined,
  recipeQuantity: string | null | undefined,
): InventoryDeductionResult {
  const inventory = canonicalQuantity(inventoryQuantity);
  const required = canonicalQuantity(recipeQuantity);
  const base = {
    previousQuantity: inventoryQuantity?.trim() || null,
    requiredQuantity: recipeQuantity?.trim() || null,
  };
  if (!inventory || !required) {
    return { ...base, status: "unstructured", usedQuantity: null, nextQuantity: base.previousQuantity };
  }
  if (inventory.canonicalUnit !== required.canonicalUnit) {
    return { ...base, status: "incompatible", usedQuantity: null, nextQuantity: base.previousQuantity };
  }
  if (required.canonicalValue > inventory.canonicalValue) {
    return { ...base, status: "insufficient", usedQuantity: null, nextQuantity: base.previousQuantity };
  }

  const remainingCanonical = Math.max(0, inventory.canonicalValue - required.canonicalValue);
  const nextValue = fromCanonical(remainingCanonical, inventory.unit);
  const usedQuantity = display(required.value, required.unit, recipeQuantity);
  return {
    ...base,
    status: remainingCanonical === 0 ? "consumed" : "adjusted",
    usedQuantity,
    nextQuantity: display(nextValue, inventory.unit, inventoryQuantity),
  };
}
