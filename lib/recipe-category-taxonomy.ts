export const CANONICAL_RECIPE_CATEGORIES = [
  { id: "rice", label: "밥·한 그릇" },
  { id: "soup", label: "국" },
  { id: "stew", label: "찌개·전골" },
  { id: "side", label: "반찬" },
  { id: "egg", label: "달걀" },
  { id: "tofu", label: "두부" },
  { id: "meat", label: "고기" },
  { id: "seafood", label: "해산물" },
  { id: "noodle", label: "면" },
  { id: "snack", label: "분식" },
  { id: "western", label: "양식" },
  { id: "chinese", label: "중식" },
  { id: "japanese", label: "일식" },
  { id: "dessert", label: "간식·디저트" },
  { id: "other", label: "기타" },
] as const;

export type CanonicalRecipeCategoryId = (typeof CANONICAL_RECIPE_CATEGORIES)[number]["id"];

const CANONICAL_CATEGORY_BY_ID = new Map(
  CANONICAL_RECIPE_CATEGORIES.map((category) => [category.id, category]),
);

export function isCanonicalRecipeCategoryId(value: unknown): value is CanonicalRecipeCategoryId {
  return typeof value === "string" && CANONICAL_CATEGORY_BY_ID.has(value as CanonicalRecipeCategoryId);
}

export function canonicalRecipeCategoryLabel(id: CanonicalRecipeCategoryId): string {
  return CANONICAL_CATEGORY_BY_ID.get(id)?.label ?? "기타";
}

export type LegacyRecipeCategoryResolution =
  | {
      status: "mapped";
      source: string;
      categoryId: CanonicalRecipeCategoryId;
    }
  | {
      status: "missing" | "unresolved";
      source: string | null;
      categoryId: null;
      reason: string;
    };

const LEGACY_CATEGORY_MAP: Readonly<Record<string, CanonicalRecipeCategoryId>> = {
  "밥·한 그릇": "rice",
  밥: "rice",
  국: "soup",
  "찌개·전골": "stew",
  찌개: "stew",
  전골: "stew",
  반찬: "side",
  "도시락/반찬": "side",
  계란요리: "egg",
  달걀: "egg",
  두부: "tofu",
  고기: "meat",
  육류: "meat",
  해산물: "seafood",
  수산물: "seafood",
  면: "noodle",
  면요리: "noodle",
  분식: "snack",
  양식: "western",
  중식: "chinese",
  일식: "japanese",
  디저트: "dessert",
  "간식·디저트": "dessert",
  후식: "dessert",
  기타: "other",
  일품: "other",
};

const UNRESOLVED_REASON: Readonly<Record<string, string>> = {
  "국&찌개": "국과 찌개가 합쳐진 값이라 soup 또는 stew를 편집자가 선택해야 합니다.",
  "국·찌개": "국과 찌개가 합쳐진 값이라 soup 또는 stew를 편집자가 선택해야 합니다.",
  "국/찌개": "국과 찌개가 합쳐진 값이라 soup 또는 stew를 편집자가 선택해야 합니다.",
  한식: "요리 종류가 아니라 cuisine 값이므로 dish category를 별도로 선택해야 합니다.",
  "김치/밥 요리": "재료 묶음과 요리 종류가 섞여 있어 자동 분류하지 않습니다.",
  "두부/저렴 재료": "재료 묶음과 가격 속성이 섞여 있어 자동 분류하지 않습니다.",
  "참치캔/스팸/햄/어묵": "여러 재료 묶음이라 자동 분류하지 않습니다.",
  "전자레인지/노불": "조리 도구 필터이므로 dish category로 변환하지 않습니다.",
  "10분요리": "조리 시간 필터이므로 dish category로 변환하지 않습니다.",
  초보가능: "검수 상태 필터이므로 dish category로 변환하지 않습니다.",
};

export function resolveLegacyRecipeCategory(value: unknown): LegacyRecipeCategoryResolution {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      status: "missing",
      source: null,
      categoryId: null,
      reason: "기존 카테고리가 비어 있습니다.",
    };
  }

  const source = value.trim();
  const categoryId = LEGACY_CATEGORY_MAP[source];
  if (categoryId) {
    return { status: "mapped", source, categoryId };
  }

  return {
    status: "unresolved",
    source,
    categoryId: null,
    reason: UNRESOLVED_REASON[source] ?? "명시적인 카테고리 매핑이 없어 편집자 검수가 필요합니다.",
  };
}
