// 집밥노트 데이터 레이어에서 공통으로 사용하는 재료 타입 정의입니다.
export const INGREDIENT_CATEGORIES = [
  "채소",
  "과일",
  "육류",
  "수산물",
  "유제품",
  "냉동식품",
  "조미료",
  "곡물/면/빵",
  "통조림/가공식품",
  "음료/기타",
] as const;

export const INGREDIENT_STORAGE_TYPES = ["냉장", "냉동", "실온"] as const;

export const INGREDIENT_UNIT_SYSTEMS = ["metric", "spoon", "count"] as const;

export const INGREDIENT_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tbsp",
  "tsp",
  "cup",
  "piece",
  "pack",
  "bag",
  "can",
  "bottle",
  "block",
  "sheet",
  "slice",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export type IngredientStorageType = (typeof INGREDIENT_STORAGE_TYPES)[number];

export type IngredientUnitSystem = (typeof INGREDIENT_UNIT_SYSTEMS)[number];

export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export type LocalSyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "conflict";

export interface IngredientCatalogItem {
  id: string;
  category: IngredientCategory;
  name: string;
  aliases?: string[];
  defaultStorageType?: IngredientStorageType;
  defaultUnit?: IngredientUnit;
}

export interface IngredientRecord {
  id: string;
  deviceId: string;
  userId: string | null;
  familyGroupId?: string | null;
  name: string;
  category: IngredientCategory | null;
  storageType: IngredientStorageType;
  quantity: string | null;
  expiryDate: string | null;
  purchaseDate?: string | null;
  openedAt?: string | null;
  storageLocation?: string | null;
  unitPrice?: number | null;
  purchasePlace?: string | null;
  consumedAt?: string | null;
  discardedAt?: string | null;
  repeatPurchase?: boolean;
  barcode: string | null;
  imageUrl: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus?: LocalSyncStatus;
  lastSyncedAt?: string | null;
}

export interface IngredientFormPayload {
  name: string;
  category?: IngredientCategory | null;
  storageType?: IngredientStorageType;
  quantity?: string | null;
  expiryDate?: string | null;
  purchaseDate?: string | null;
  openedAt?: string | null;
  storageLocation?: string | null;
  unitPrice?: number | null;
  purchasePlace?: string | null;
  consumedAt?: string | null;
  discardedAt?: string | null;
  repeatPurchase?: boolean;
  barcode?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
}

export interface IngredientInsertPayload {
  device_id: string;
  user_id?: string | null;
  family_group_id?: string | null;
  name: string;
  category?: IngredientCategory | null;
  storage_type?: IngredientStorageType;
  quantity?: string | null;
  expiry_date?: string | null;
  purchase_date?: string | null;
  opened_at?: string | null;
  storage_location?: string | null;
  unit_price?: number | null;
  purchase_place?: string | null;
  consumed_at?: string | null;
  discarded_at?: string | null;
  repeat_purchase?: boolean;
  barcode?: string | null;
  image_url?: string | null;
  memo?: string | null;
}

export interface IngredientUpdatePayload {
  family_group_id?: string | null;
  name?: string;
  category?: IngredientCategory | null;
  storage_type?: IngredientStorageType;
  quantity?: string | null;
  expiry_date?: string | null;
  purchase_date?: string | null;
  opened_at?: string | null;
  storage_location?: string | null;
  unit_price?: number | null;
  purchase_place?: string | null;
  consumed_at?: string | null;
  discarded_at?: string | null;
  repeat_purchase?: boolean;
  barcode?: string | null;
  image_url?: string | null;
  memo?: string | null;
}

export interface IngredientQueryError {
  message: string;
  source: "supabase" | "local";
}

// 장보기 플로우에서 사용하는 타입입니다.
export interface ShoppingItem {
  id: string;
  deviceId: string;
  userId: string | null;
  familyGroupId?: string | null;
  name: string;
  quantity: string | null;
  category: IngredientCategory | null;
  checked: boolean;
  sourceRecipeId: string | null;
  sourceRecipeName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  syncStatus?: LocalSyncStatus;
  lastSyncedAt?: string | null;
}

export interface ShoppingItemDraft {
  name: string;
  quantity?: string | null;
  category?: IngredientCategory | null;
  familyGroupId?: string | null;
  sourceRecipeId?: string | null;
  sourceRecipeName?: string | null;
}

// Phase 5: 로그인 + 커뮤니티에서 사용하는 공통 타입입니다.
export type OAuthProvider = "google" | "kakao" | "apple";

export interface AuthProviderOption {
  provider: OAuthProvider;
  label: string;
  enabled: boolean;
}

export interface AuthQueryError {
  message: string;
  source: "supabase" | "local" | "config";
}

export interface DeviceDataMigrationTableResult {
  table: string;
  migratedCount: number;
  skipped: boolean;
  reason?: string;
}

export interface DeviceDataMigrationResult {
  totalMigratedCount: number;
  localMigratedCount: number;
  tableResults: DeviceDataMigrationTableResult[];
  remoteMigrationMode?: "legacy_table_claim" | "signed_session_sync";
}

export type CommunityDataSource = "supabase" | "local";

export interface CommunityPostRecord {
  id: string;
  deviceId: string;
  userId: string | null;
  authorName: string;
  title: string;
  content: string;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityCommentRecord {
  id: string;
  postId: string;
  deviceId: string;
  userId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityLikeRecord {
  id: string;
  postId: string;
  deviceId: string | null;
  userId: string | null;
  createdAt: string;
}

export interface FamilyMemberRecord {
  id: string;
  name: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface FamilyGroupRecord {
  id: string;
  name: string;
  inviteCode: string;
  ownerName: string;
  members: FamilyMemberRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostPayload {
  title: string;
  content: string;
}

export interface CommunityCommentPayload {
  content: string;
}

export interface CommunityQueryError {
  message: string;
  source: "supabase" | "local" | "config";
}

// 레시피 페이지에서 공통으로 사용하는 카테고리/응답/매칭 타입 정의입니다.
export const RECIPE_CATEGORIES = [
  "전체",
  "계란요리",
  "김치/밥 요리",
  "두부/저렴 재료",
  "참치캔/스팸/햄/어묵",
  "국/찌개",
  "면요리",
  "전자레인지/노불",
  "도시락/반찬",
  "반찬",
  "국·찌개",
  "밥",
  "일품",
  "한식",
  "중식",
  "양식",
  "일식",
  "분식",
  "디저트",
  "밥·한 그릇",
  "국",
  "찌개·전골",
  "달걀",
  "두부",
  "고기",
  "해산물",
  "면",
  "간식·디저트",
  "기타",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export type RecipeQueryCategory = Exclude<RecipeCategory, "전체">;

export const DISPLAY_RECIPE_CATEGORIES = [
  "전체",
  "밥·한 그릇",
  "국",
  "찌개·전골",
  "반찬",
  "달걀",
  "두부",
  "고기",
  "해산물",
  "면",
  "분식",
  "양식",
  "중식",
  "일식",
  "간식·디저트",
  "기타",
  "초보가능",
  "10분요리",
] as const;

export type DisplayRecipeCategory = (typeof DISPLAY_RECIPE_CATEGORIES)[number];

export type RecipeCategoryCounts = Partial<Record<RecipeCategory | DisplayRecipeCategory, number>>;

export type RecipeDifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type RecipeSafetyLevel = "A" | "B" | "C" | "D";

export type RecipeSourceType =
  | "original"
  | "original-general-principle"
  | "public-data"
  | "licensed-kogl"
  | "trend-reference-platform"
  | "reference-link";

export type RecipeReleaseTier =
  | "onboarding"
  | "release_30"
  | "core_50"
  | "library_100"
  | "candidate"
  | "blocked";

export type RecipePublishStatus =
  | "draft"
  | "needs_rewrite"
  | "rights_review"
  | "qa_ready"
  | "published"
  | "hidden";

export type RecipeReviewStatus =
  | "imported"
  | "normalizing"
  | "editorial_review"
  | "beginner_review"
  | "cooking_test"
  | "approved"
  | "needs_revision"
  | "rejected"
  | "archived";

export type RecipeImageRightsStatus = "unverified" | "approved" | "no_image_approved" | "rejected";

export interface RecipePublicationEvidence {
  reviewStatus: "approved";
  reviewedForBeginner: true;
  beginnerReviewedAt: string;
  actualCookingTested: true;
  actualCookingTestedAt: string;
  foodSafetyReviewed: true;
  foodSafetyReviewedAt: string;
  imageRightsStatus: "approved" | "no_image_approved";
  imageRightsReviewedAt: string;
  sourceRecorded: true;
  sourceReviewedAt: string;
  publishedAt: string;
  reviewer: string;
  requirementsVerified: true;
}

export type RecipeHeatLevel = "불 없음" | "약불" | "중약불" | "중불" | "강불";

export interface RecipeHomeCardCopy {
  title: string;
  subtitle: string;
  badge: string;
  cta: string;
}

export interface BeginnerRecipeSource {
  sourceType: RecipeSourceType;
  sourceName: string;
  sourceUrl?: string | null;
  licenseOrUsageNote: string;
  rightsNote: string;
  imageUsageAllowed: boolean;
  adaptedByJipbabNote: boolean;
}

export interface BeginnerRecipeSafety {
  safetyLevel: RecipeSafetyLevel;
  copyrightRisk: "low" | "medium" | "high";
  privacyRisk: "low" | "medium" | "high";
  commercialUseRisk: "low" | "medium" | "high";
  notes?: string | null;
  imageUsageAllowed?: boolean;
  adaptedByJipbabNote?: boolean;
}

export interface RecipeRecord {
  id: string;
  slug?: string;
  title?: string;
  summary?: string | null;
  name: string;
  category: string;
  method: string;
  calories: string;
  thumbnailUrl: string | null;
  ingredients: string;
  hashTag: string;
  difficultyLevel?: RecipeDifficultyLevel | null;
  beginnerScore?: number | null;
  totalMinutes?: number | null;
  servings?: number | null;
  activeMinutes?: number | null;
  requiredTools?: string[];
  homeCardCopy?: string | RecipeHomeCardCopy | null;
  noFire?: boolean | null;
  microwave?: boolean | null;
  fallbackMeal?: string | null;
  source?: BeginnerRecipeSource | null;
  safety?: BeginnerRecipeSafety | null;
  releaseTier?: RecipeReleaseTier | null;
  publishStatus?: RecipePublishStatus | null;
  publicationEvidence?: RecipePublicationEvidence | null;
}

export interface RecipeListResponse {
  recipes: RecipeRecord[];
  totalCount: number;
  page: number;
  size: number;
  categoryCounts?: RecipeCategoryCounts;
  code?: string;
  message?: string;
}

export interface RecipeMatchResult {
  matchRate: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  totalRecipeIngredients: number;
}

export interface RecipeWithMatch extends RecipeRecord, RecipeMatchResult {
  ingredientList: string[];
}

export interface RecipeDetailStep {
  index: number;
  order?: number;
  title?: string | null;
  action?: string | null;
  description: string;
  imageUrl: string | null;
  heat?: RecipeHeatLevel | string | null;
  minutes?: number | null;
  durationSecondsMin?: number | null;
  durationSecondsMax?: number | null;
  timerPresetSeconds?: number | null;
  beginnerTip?: string | null;
  safetyNote?: string | null;
  visualCue?: string | null;
  commonMistake?: string | null;
  rescueTip?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  ingredientUsages?: RecipeStepIngredientUsage[];
}

export interface RecipeStepIngredientUsage {
  recipeIngredientId: string;
  usageText: string | null;
}

export interface RecipeIngredientSubstitution {
  ingredientId: string | null;
  name: string;
  ratio: string | null;
  caution: string | null;
}

export interface RecipeIngredientDetail {
  id?: string;
  ingredientId?: string | null;
  name: string;
  display: string;
  amount?: string | null;
  unit?: string | null;
  required?: boolean;
  pantryStaple?: boolean;
  substitute?: string | null;
  substitutions?: RecipeIngredientSubstitution[];
  beginnerNote?: string | null;
  prepNote?: string | null;
}

export interface RecipeServingQuantity {
  recipeIngredientId: string;
  display: string;
  amount: string | null;
  unit: string | null;
}

export interface RecipeServingOption {
  servings: number;
  toolGuidance: string;
  timeGuidance: string;
  ingredientQuantities: RecipeServingQuantity[];
}

export interface RecipeDetailRecord extends RecipeRecord {
  version?: number;
  ingredientList: string[];
  ingredientDetails?: RecipeIngredientDetail[];
  substituteIngredients?: RecipeIngredientDetail[];
  steps: RecipeDetailStep[];
  difficulty?: number | string | null;
  difficultyLevel?: RecipeDifficultyLevel | null;
  beginnerScore?: number | null;
  cookingTime?: number | null;
  totalMinutes?: number | null;
  activeMinutes?: number | null;
  servings?: number | null;
  servingOptions?: RecipeServingOption[];
  requiredTools?: string[];
  beforeStart?: string[];
  beginnerSummary?: string | null;
  measurementTips?: string[];
  successCheck?: string | null;
  safetyNotes?: string[];
  storageTip?: string | null;
  reheatTip?: string | null;
  fallbackMeal?: string | null;
  homeCardCopy?: string | RecipeHomeCardCopy | null;
  source?: BeginnerRecipeSource | null;
  safety?: BeginnerRecipeSafety | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  recipePosterImageUrl?: string | null;
  recipeGuideImageUrl?: string | null;
  recipePrepImageUrl?: string | null;
  recipeStepsImageUrl?: string | null;
  sourceProvider?: string | null;
  sourceTitle?: string | null;
  sourceExternalId?: string | null;
  sourceUrl?: string | null;
  sourceAttribution?: string | null;
  sourceLicense?: string | null;
  contentOrigin?: "original" | "public_api" | "licensed" | "user_bookmark" | null;
  reviewedForBeginner?: boolean;
}

export interface RecipeCommentRecord {
  id: string;
  recipeId: string;
  deviceId: string;
  userId: string | null;
  authorName: string;
  content: string;
  status: "visible" | "hidden" | "deleted";
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCommentPayload {
  content: string;
}

export interface FavoriteRecipeSummary {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string | null;
  savedAt: string;
  publicationEvidence?: RecipePublicationEvidence | null;
}

export interface QuantityValueParts {
  amountValue: number | null;
  amountUnit: IngredientUnit | null;
  quantityDisplay: string | null;
}
