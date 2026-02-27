// 집밥노트 데이터 레이어에서 공통으로 사용하는 재료 타입 정의입니다.
export const INGREDIENT_CATEGORIES = [
  "채소",
  "과일",
  "육류",
  "수산물",
  "유제품",
  "양념",
  "기타",
] as const;

export const INGREDIENT_STORAGE_TYPES = ["냉장", "냉동", "실온"] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export type IngredientStorageType = (typeof INGREDIENT_STORAGE_TYPES)[number];

export interface IngredientRecord {
  id: string;
  deviceId: string;
  userId: string | null;
  name: string;
  category: IngredientCategory | null;
  storageType: IngredientStorageType;
  quantity: string | null;
  expiryDate: string | null;
  barcode: string | null;
  imageUrl: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientFormPayload {
  name: string;
  category?: IngredientCategory | null;
  storageType?: IngredientStorageType;
  quantity?: string | null;
  expiryDate?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  memo?: string | null;
}

export interface IngredientInsertPayload {
  device_id: string;
  user_id?: string | null;
  name: string;
  category?: IngredientCategory | null;
  storage_type?: IngredientStorageType;
  quantity?: string | null;
  expiry_date?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  memo?: string | null;
}

export interface IngredientUpdatePayload {
  name?: string;
  category?: IngredientCategory | null;
  storage_type?: IngredientStorageType;
  quantity?: string | null;
  expiry_date?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  memo?: string | null;
}

export interface IngredientQueryError {
  message: string;
  source: "supabase" | "local";
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
  "한식",
  "중식",
  "양식",
  "일식",
  "분식",
  "디저트",
  "국·찌개",
  "반찬",
  "기타",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export type RecipeQueryCategory = Exclude<RecipeCategory, "전체">;

export interface RecipeRecord {
  id: string;
  name: string;
  category: string;
  method: string;
  calories: string;
  thumbnailUrl: string | null;
  ingredients: string;
  hashTag: string;
}

export interface RecipeListResponse {
  recipes: RecipeRecord[];
  totalCount: number;
  page: number;
  size: number;
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
  description: string;
  imageUrl: string | null;
}

export interface RecipeDetailRecord extends RecipeRecord {
  ingredientList: string[];
  steps: RecipeDetailStep[];
}

export interface FavoriteRecipeSummary {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string | null;
  savedAt: string;
}
