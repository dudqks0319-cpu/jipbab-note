// 이 파일은 재료 수량 문자열을 합치고 조리 후 차감하는 도우미를 담당합니다.
const QUANTITY_PATTERN = /^\s*(\d+(?:\.\d+)?)\s*([a-zA-Z가-힣]+)?\s*$/;
const RECIPE_QUANTITY_PATTERN = /(\d+(?:\.\d+)?)\s*(kg|g|mg|ml|l|컵|큰술|작은술|스푼|개|장|줄기|봉|봉지|마리|모|쪽|알|팩|톨|줌|한줌)/i;
const UNIT_ALIASES: Record<string, string> = {
  그램: "g",
  키로: "kg",
  리터: "l",
  밀리리터: "ml",
};

export type ParsedQuantity = {
  amount: number;
  unit: string;
};

export type QuantityChangeResult = {
  quantity: string | null;
  depleted: boolean;
};

export function normalizeIngredientKey(value: string): string {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function normalizeUnit(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return UNIT_ALIASES[trimmed] ?? trimmed;
}

export function parseQuantity(value: string | null | undefined): ParsedQuantity | null {
  if (!value) {
    return null;
  }

  const match = value.match(QUANTITY_PATTERN);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return {
    amount,
    unit: normalizeUnit(match[2]),
  };
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatQuantity(quantity: ParsedQuantity): string {
  return `${formatAmount(quantity.amount)}${quantity.unit}`;
}

export function mergeQuantityText(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const currentText = current?.trim() ?? "";
  const incomingText = incoming?.trim() ?? "";

  if (!currentText) {
    return incomingText || null;
  }
  if (!incomingText) {
    return currentText;
  }

  const currentParsed = parseQuantity(currentText);
  const incomingParsed = parseQuantity(incomingText);

  if (currentParsed && incomingParsed && currentParsed.unit === incomingParsed.unit) {
    return formatQuantity({
      amount: currentParsed.amount + incomingParsed.amount,
      unit: currentParsed.unit,
    });
  }

  if (currentText.includes(incomingText)) {
    return currentText;
  }

  return `${currentText} + ${incomingText}`;
}

export function parseRecipeQuantity(value: string): ParsedQuantity | null {
  const match = value.match(RECIPE_QUANTITY_PATTERN);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return {
    amount,
    unit: normalizeUnit(match[2]),
  };
}

export function consumeQuantityText(
  current: string | null | undefined,
  recipeIngredientText: string,
): QuantityChangeResult {
  const currentParsed = parseQuantity(current);
  const recipeParsed = parseRecipeQuantity(recipeIngredientText);

  if (!currentParsed) {
    return {
      quantity: current?.trim() || null,
      depleted: false,
    };
  }

  if (!recipeParsed || currentParsed.unit !== recipeParsed.unit) {
    return {
      quantity: currentParsed.amount <= 1 ? null : formatQuantity({ ...currentParsed, amount: currentParsed.amount - 1 }),
      depleted: currentParsed.amount <= 1,
    };
  }

  const nextAmount = currentParsed.amount - recipeParsed.amount;
  if (nextAmount <= 0) {
    return {
      quantity: null,
      depleted: true,
    };
  }

  return {
    quantity: formatQuantity({ amount: nextAmount, unit: currentParsed.unit }),
    depleted: false,
  };
}

