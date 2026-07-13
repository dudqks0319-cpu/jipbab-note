// 이 파일은 레시피 기준 인분을 바꿀 때 숫자로 해석 가능한 재료 계량만 안전하게 환산합니다.
const LEADING_QUANTITY_PATTERN = /^(\d+\/\d+|\d+(?:\.\d+)?)(.*)$/;

function parseQuantity(value: string): number | null {
  if (value.includes("/")) {
    const [numerator, denominator] = value.split("/").map(Number);
    if (!numerator || !denominator) return null;
    return numerator / denominator;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(2)));
}

export function scaleIngredientDisplay(
  display: string,
  baseServings: number,
  requestedServings: number,
): string {
  if (!Number.isFinite(baseServings) || baseServings <= 0) return display;
  if (!Number.isFinite(requestedServings) || requestedServings <= 0) return display;
  const match = display.trim().match(LEADING_QUANTITY_PATTERN);
  if (!match) return display;
  const quantity = parseQuantity(match[1] ?? "");
  if (quantity === null) return display;
  return `${formatQuantity(quantity * (requestedServings / baseServings))}${match[2] ?? ""}`;
}
