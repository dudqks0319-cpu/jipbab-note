import type {
  IngredientUnit,
  IngredientUnitSystem,
  QuantityValueParts,
} from "../types/index.ts";

const unitLabels: Record<IngredientUnitSystem, Record<IngredientUnit, string>> = {
  metric: {
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "L",
    tbsp: "큰술",
    tsp: "작은술",
    cup: "컵",
    piece: "개",
    pack: "팩",
    bag: "봉",
    can: "캔",
    bottle: "병",
    block: "모",
    sheet: "장",
    slice: "장",
  },
  spoon: {
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "L",
    tbsp: "큰술",
    tsp: "작은술",
    cup: "컵",
    piece: "개",
    pack: "팩",
    bag: "봉",
    can: "캔",
    bottle: "병",
    block: "모",
    sheet: "장",
    slice: "장",
  },
  count: {
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "L",
    tbsp: "큰술",
    tsp: "작은술",
    cup: "컵",
    piece: "개",
    pack: "팩",
    bag: "봉",
    can: "캔",
    bottle: "병",
    block: "모",
    sheet: "장",
    slice: "장",
  },
};

const isTightJoinUnit = new Set<IngredientUnit>(["g", "kg", "ml", "l"]);

function normalizeValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatIngredientQuantity(
  parts: QuantityValueParts,
  unitSystem: IngredientUnitSystem,
): string {
  if (
    parts.amountValue !== null &&
    Number.isFinite(parts.amountValue) &&
    parts.amountUnit
  ) {
    const label = unitLabels[unitSystem][parts.amountUnit];
    const valueLabel = normalizeValue(parts.amountValue);

    if (isTightJoinUnit.has(parts.amountUnit)) {
      return `${valueLabel}${label}`;
    }

    if (unitSystem === "spoon" && (parts.amountUnit === "tbsp" || parts.amountUnit === "tsp")) {
      return `${label} ${valueLabel}`;
    }

    return `${valueLabel}${label}`;
  }

  return parts.quantityDisplay?.trim() || "";
}

export function buildQuantityDisplay(
  amountValue: number | null,
  amountUnit: IngredientUnit | null,
  unitSystem: IngredientUnitSystem,
): string | null {
  if (amountValue === null || !Number.isFinite(amountValue) || !amountUnit) {
    return null;
  }

  return formatIngredientQuantity(
    {
      amountValue,
      amountUnit,
      quantityDisplay: null,
    },
    unitSystem,
  );
}

export function getUnitOptionsForSystem(
  unitSystem: IngredientUnitSystem,
): Array<{ value: IngredientUnit; label: string }> {
  const unitGroups: Record<IngredientUnitSystem, IngredientUnit[]> = {
    metric: ["g", "kg", "ml", "l", "piece", "pack", "bag"],
    spoon: ["tbsp", "tsp", "cup", "piece", "pack"],
    count: ["piece", "pack", "bag", "can", "bottle", "block", "sheet", "slice"],
  };

  return unitGroups[unitSystem].map((value) => ({
    value,
    label: unitLabels[unitSystem][value],
  }));
}

export function parseQuantityDisplay(
  quantity: string | null | undefined,
): { amountValue: string; amountUnit: IngredientUnit | null } {
  const raw = quantity?.trim();
  if (!raw) {
    return {
      amountValue: "",
      amountUnit: null,
    };
  }

  const tightMatch = raw.match(/^(\d+(?:\.\d+)?)(g|kg|ml|L|개|팩|봉|캔|병|모|장)$/i);
  if (tightMatch) {
    const unitMap: Record<string, IngredientUnit> = {
      g: "g",
      kg: "kg",
      ml: "ml",
      l: "l",
      개: "piece",
      팩: "pack",
      봉: "bag",
      캔: "can",
      병: "bottle",
      모: "block",
      장: "slice",
    };

    return {
      amountValue: tightMatch[1],
      amountUnit: unitMap[tightMatch[2].toLowerCase()] ?? unitMap[tightMatch[2]] ?? null,
    };
  }

  const looseMatch = raw.match(/^(큰술|작은술|컵)\s*(\d+(?:\.\d+)?)$/);
  if (looseMatch) {
    const looseUnitMap: Record<string, IngredientUnit> = {
      큰술: "tbsp",
      작은술: "tsp",
      컵: "cup",
    };

    return {
      amountValue: looseMatch[2],
      amountUnit: looseUnitMap[looseMatch[1]] ?? null,
    };
  }

  return {
    amountValue: "",
    amountUnit: null,
  };
}
