// 이 파일은 실제 주간 식단의 날짜·식사 슬롯·메뉴 입력 계약을 검증합니다.

export const MEAL_TYPES = [
  { id: "breakfast", label: "아침" },
  { id: "lunch", label: "점심" },
  { id: "dinner", label: "저녁" },
] as const;

export const MEAL_ENTRY_KINDS = ["recipe", "leftovers", "dining_out", "delivery", "custom"] as const;

export type MealType = (typeof MEAL_TYPES)[number]["id"];
export type MealEntryKind = (typeof MEAL_ENTRY_KINDS)[number];

export type MealPlanItem = {
  date: string;
  mealType: MealType;
  kind: MealEntryKind;
  recipeId: string | null;
  title: string;
  servings: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEAL_TYPE_IDS = new Set<string>(MEAL_TYPES.map((item) => item.id));
const ENTRY_KIND_IDS = new Set<string>(MEAL_ENTRY_KINDS);
const ITEM_KEYS = new Set(["date", "mealType", "kind", "recipeId", "title", "servings"]);

function parseDate(value: unknown): string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) throw new Error("invalid_meal_plan");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("invalid_meal_plan");
  }
  return value;
}

export function getWeekStart(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + offset);
  return utc.toISOString().slice(0, 10);
}

export function getWeekDates(weekStart: string): string[] {
  const start = new Date(`${parseDate(weekStart)}T00:00:00.000Z`);
  if (start.getUTCDay() !== 1) throw new Error("invalid_meal_plan");
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function parseMealPlanInput(value: unknown): { weekStart: string; items: MealPlanItem[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_meal_plan");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "weekStart" && key !== "items")) {
    throw new Error("invalid_meal_plan");
  }
  const weekStart = parseDate(input.weekStart);
  const weekDates = new Set(getWeekDates(weekStart));
  if (!Array.isArray(input.items) || input.items.length > 21) throw new Error("invalid_meal_plan");

  const seenSlots = new Set<string>();
  const items = input.items.map((value): MealPlanItem => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_meal_plan");
    const item = value as Record<string, unknown>;
    if (Object.keys(item).some((key) => !ITEM_KEYS.has(key))) throw new Error("invalid_meal_plan");
    const date = parseDate(item.date);
    const mealType = typeof item.mealType === "string" ? item.mealType.trim() : "";
    const kind = typeof item.kind === "string" ? item.kind.trim() : "";
    const recipeId = typeof item.recipeId === "string" && item.recipeId.trim()
      ? item.recipeId.trim()
      : null;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const servings = Number(item.servings);
    const slot = `${date}:${mealType}`;
    if (
      !weekDates.has(date)
      || !MEAL_TYPE_IDS.has(mealType)
      || !ENTRY_KIND_IDS.has(kind)
      || title.length < 1
      || title.length > 120
      || !Number.isInteger(servings)
      || servings < 1
      || servings > 12
      || seenSlots.has(slot)
      || (kind === "recipe" && (!recipeId || !UUID_PATTERN.test(recipeId)))
      || (kind !== "recipe" && recipeId !== null)
    ) {
      throw new Error("invalid_meal_plan");
    }
    seenSlots.add(slot);
    return {
      date,
      mealType: mealType as MealType,
      kind: kind as MealEntryKind,
      recipeId,
      title,
      servings,
    };
  });

  return { weekStart, items };
}
