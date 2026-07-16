// 이 파일은 레시피 오류 신고 입력을 제한된 구조로 검증합니다.

export const RECIPE_ISSUE_TYPES = [
  { id: "ingredient_amount", label: "재료·계량 정보" },
  { id: "instruction", label: "조리 순서·설명" },
  { id: "time_servings", label: "시간·인분" },
  { id: "allergen", label: "알레르기 정보" },
  { id: "food_safety", label: "식품 안전" },
  { id: "image", label: "사진" },
  { id: "source_rights", label: "출처·권리" },
  { id: "other", label: "기타" },
] as const;

export type RecipeIssueType = (typeof RECIPE_ISSUE_TYPES)[number]["id"];

export const RECIPE_ISSUE_STATUSES = ["open", "triaged", "resolved", "rejected"] as const;
export type RecipeIssueStatus = (typeof RECIPE_ISSUE_STATUSES)[number];

const RECIPE_ISSUE_TYPE_IDS = new Set<string>(RECIPE_ISSUE_TYPES.map((item) => item.id));
const MAX_DETAILS_LENGTH = 500;
const RECIPE_ISSUE_STATUS_IDS = new Set<string>(RECIPE_ISSUE_STATUSES);
const MAX_RESOLUTION_NOTE_LENGTH = 2000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUS_TRANSITIONS: Record<RecipeIssueStatus, ReadonlySet<RecipeIssueStatus>> = {
  open: new Set(["triaged", "rejected"]),
  triaged: new Set(["open", "resolved", "rejected"]),
  resolved: new Set(["triaged"]),
  rejected: new Set(["triaged"]),
};

export function parseRecipeIssueReportInput(value: unknown): {
  issueType: RecipeIssueType;
  details: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_recipe_issue_report");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "issueType" && key !== "details")) {
    throw new Error("invalid_recipe_issue_report");
  }
  const issueType = typeof input.issueType === "string" ? input.issueType.trim() : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";
  if (
    !RECIPE_ISSUE_TYPE_IDS.has(issueType) ||
    details.length < 3 ||
    details.length > MAX_DETAILS_LENGTH
  ) {
    throw new Error("invalid_recipe_issue_report");
  }
  return { issueType: issueType as RecipeIssueType, details };
}

export function parseRecipeIssueTriageInput(value: unknown): {
  status: RecipeIssueStatus;
  resolutionNote: string | null;
  resolutionRecipeVersionId: string | null;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_recipe_issue_triage");
  }
  const input = value as Record<string, unknown>;
  const allowedKeys = new Set(["status", "resolutionNote", "resolutionRecipeVersionId"]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    throw new Error("invalid_recipe_issue_triage");
  }

  const status = typeof input.status === "string" ? input.status.trim().toLowerCase() : "";
  const resolutionNote = typeof input.resolutionNote === "string"
    ? input.resolutionNote.trim()
    : "";
  const resolutionRecipeVersionId = typeof input.resolutionRecipeVersionId === "string"
    ? input.resolutionRecipeVersionId.trim()
    : "";

  if (
    !RECIPE_ISSUE_STATUS_IDS.has(status) ||
    resolutionNote.length > MAX_RESOLUTION_NOTE_LENGTH ||
    (status === "resolved" && (resolutionNote.length < 3 || !resolutionRecipeVersionId)) ||
    (resolutionRecipeVersionId && !UUID_PATTERN.test(resolutionRecipeVersionId))
  ) {
    throw new Error("invalid_recipe_issue_triage");
  }

  return {
    status: status as RecipeIssueStatus,
    resolutionNote: resolutionNote || null,
    resolutionRecipeVersionId: resolutionRecipeVersionId || null,
  };
}

export function isAllowedRecipeIssueStatusTransition(
  currentStatus: RecipeIssueStatus,
  nextStatus: RecipeIssueStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus].has(nextStatus);
}
