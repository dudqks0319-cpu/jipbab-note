# 집밥노트 냉장고 6열·이유식 확장·24~36개월 유아식 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: implement this plan task-by-task using a test-first workflow. Every checkbox is a reviewable unit. Do not publish child-meal content until all publication gates pass.

**Goal:** 빈 냉장고 미리보기의 6열 UI를 복구하고, 기존 이유식과 공존하는 24~36개월 유아식 탐색·추천·상세·조리·장보기·주간 식단·콘텐츠 검수 체계를 실제 출시 가능한 수준으로 구현한다.

**Architecture:** 기존 `recipes`/API V1/출판 승인 체계를 유지하고, 월령·식감·알레르겐·질식 위험·가족식 분리 조리 정보를 `recipe_child_guidance`라는 부가 도메인으로 연결한다. 아동식 설정은 MVP에서 로컬 저장하고, 공개 API는 기존 레시피 승인과 신규 아동식 승인을 모두 통과한 데이터만 반환한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, Capacitor, Node test runner

## Global Constraints

- 정확한 생년월일, 아이 이름, 키, 체중, 질병명은 수집하지 않는다.
- 월령 구간과 제외 알레르겐은 MVP에서 로컬 저장한다.
- 월령·알레르겐·출판 승인·아동식 승인은 하드 제외 조건이다.
- 기존 집밥 API와 화면은 하위 호환성을 유지한다.
- `security definer` 함수는 추가하지 않는다.
- `anon`/`authenticated`가 `recipe_child_guidance`를 직접 조회하지 못하게 한다.
- 기능 플래그 기본값은 `false`다.
- 실제 조리와 안전 검수를 통과하지 않은 아동식 레시피는 공개하지 않는다.

---

## 1. 제품 범위

### 1.1 이번 릴리스

- 냉장고 내부 재료 한 줄 6개 UI 복구
- `집밥 / 이유식 / 유아식` 모드
- 유아식 월령 구간 `24~29개월 / 30~36개월`
- 유아식 식감 `부드럽게 씹기 / 가족식 크기`
- 구조화된 알레르겐 제외
- 10분, 한 그릇, 가족식 같이, 냉동 가능 필터
- 유아식 카드·상세·조리 모드
- 가족식에서 아이 몫 먼저 덜기
- 유아식 장보기 메타
- 유아식 주간 식단
- 저압박 식사 피드백
- 콘텐츠 자동 검수
- 1차 검수용 12개 유아식 초안

### 1.2 이번 릴리스에서 제외

- 의료 진단
- 알레르기 자동 판정
- 아이 성장 평가
- 칼로리 기반 건강 점수
- 정확한 생년월일 저장
- 서버 동기화된 아동 프로필
- 완밥률과 식사량 추적
- 외부 블로그·영상 이미지의 무단 사용

## 2. 냉장고 6열 회귀 수정

### 현재 원인

`components/home/StarterActionCard.tsx`는 2열 큰 카드로 표시하고, `app/page.tsx`의 실제 냉장고는 6열 작은 타일로 표시한다. 빈 냉장고와 실제 냉장고가 다른 구현을 사용해 업데이트 때 한쪽만 회귀했다.

### 목표 규격

- 열: 6
- 셀 폭: 32px
- 이미지: 24×24px
- 이름: 8px, 한 줄 말줄임
- 가로 간격: 2px
- 세로 간격: 5px
- 기본 최대: 12개
- 12개 초과: 마지막 칸 `+N`
- 선택 전 가짜 재료 표시 금지
- 냉장고 내부 그리드 `pointer-events-none`
- 실제 선택 버튼 최소 44px
- 전체 재료명은 `sr-only` 목록으로 제공

### 파일

- Create: `components/home/CompactFridgeIngredientGrid.tsx`
- Modify: `components/home/StarterActionCard.tsx`
- Modify: `app/page.tsx`
- Test: `tests/home-fridge-preview-contract.test.ts`

## 3. 아동식 도메인

### TypeScript 타입

Create: `lib/child-meals/types.ts`

```ts
export const CHILD_MEAL_AUDIENCES = ["baby", "toddler"] as const;
export type ChildMealAudience = (typeof CHILD_MEAL_AUDIENCES)[number];

export const CHILD_MEAL_STAGE_CODES = [
  "baby_6_8",
  "baby_9_11",
  "toddler_12_17",
  "toddler_18_23",
  "toddler_24_29",
  "toddler_30_36",
  "toddler_24_36",
] as const;
export type ChildMealStageCode = (typeof CHILD_MEAL_STAGE_CODES)[number];

export const CHILD_TEXTURE_LEVELS = [
  "puree",
  "mashed",
  "soft_lumps",
  "soft_bite",
  "family_cut",
] as const;
export type ChildTextureLevel = (typeof CHILD_TEXTURE_LEVELS)[number];

export const CHILD_MEAL_TYPES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;
export type ChildMealType = (typeof CHILD_MEAL_TYPES)[number];

export const CHILD_ALLERGEN_CODES = [
  "egg",
  "milk",
  "wheat",
  "soy",
  "peanut",
  "tree_nut",
  "sesame",
  "buckwheat",
  "fish",
  "shellfish",
  "pork",
  "chicken",
  "beef",
  "peach",
  "tomato",
  "sulfite",
  "pine_nut",
] as const;
export type ChildAllergenCode = (typeof CHILD_ALLERGEN_CODES)[number];

export interface ChildServingShapeNote {
  ingredientName: string;
  instruction: string;
  required: boolean;
}

export interface RecipeChildGuidanceReview {
  status: "draft" | "editorial_review" | "cooking_test" | "approved" | "rejected";
  childFeedingReviewed: boolean;
  childFeedingReviewedAt: string | null;
  childFeedingReviewer: string | null;
  requirementsVerified: boolean;
}

export interface RecipeChildGuidance {
  id: string;
  recipeId: string;
  audience: ChildMealAudience;
  stageCode: ChildMealStageCode;
  minAgeMonths: number;
  maxAgeMonths: number;
  textureLevel: ChildTextureLevel;
  mealTypes: ChildMealType[];
  allergenCodes: ChildAllergenCode[];
  nutritionRoles: string[];
  chokingRiskFlags: string[];
  servingShapeNotes: ChildServingShapeNote[];
  sodiumStrategy: "no_added_salt" | "child_portion_first" | "low_sodium_product";
  familySplitSupported: boolean;
  familySplitInstruction: string | null;
  freezerFriendly: boolean;
  freezerQualityDays: number | null;
  storagePolicyCode: "eat_now" | "young_child_cooked_food" | "young_child_rice" | "recipe_specific";
  pickyEatingTip: string;
  caregiverNote: string;
  guidanceVersion: number;
  review: RecipeChildGuidanceReview;
}
```

### 로컬 설정

Create: `hooks/useChildMealSettings.ts`

저장 키:

```text
jipbab-note-child-meal-settings-v1
```

기본값:

```ts
{
  schemaVersion: 1,
  enabled: false,
  preferredAudience: "family",
  ageBand: "24_29",
  texturePreference: "soft_bite",
  excludedAllergenCodes: [],
  preferFamilySplit: true,
  preferMaxActiveMinutes: 10,
}
```

## 4. Supabase

Create: `supabase/migrations/20260712090000_add_recipe_child_guidance.sql`

필드:

- `recipe_id`
- `audience`
- `stage_code`
- `min_age_months`
- `max_age_months`
- `texture_level`
- `meal_types`
- `allergen_codes`
- `nutrition_roles`
- `choking_risk_flags`
- `serving_shape_notes`
- `sodium_strategy`
- `family_split_supported`
- `family_split_instruction`
- `freezer_friendly`
- `freezer_quality_days`
- `storage_policy_code`
- `picky_eating_tip`
- `caregiver_note`
- `guidance_version`
- `review_status`
- `child_feeding_reviewed`
- `child_feeding_reviewed_at`
- `child_feeding_reviewer`
- `requirements_verified`
- `published_at`

권한:

```sql
alter table public.recipe_child_guidance enable row level security;
revoke all on table public.recipe_child_guidance from anon, authenticated;
```

공개 조건:

```text
기존 recipe publication gate 모두 통과
AND child guidance review_status = approved
AND child_feeding_reviewed = true
AND child_feeding_reviewed_at 존재
AND child_feeding_reviewer 존재
AND requirements_verified = true
AND child guidance published_at 존재
```

## 5. API

### 목록

`GET /api/v1/recipes`

추가 쿼리:

```text
audience=family|baby|toddler
ageMonths=24
mealTypes=breakfast,lunch
excludeAllergens=egg,milk
maxActiveTime=10
freezerFriendly=true
familySplit=true
texture=soft_bite|family_cut
```

### 상세

`GET /api/v1/recipes/:id?ageMonths=24`

추가 응답:

```text
childGuidanceVariants
```

### 추천

`POST /api/v1/recommendations`

추가 입력:

```json
{
  "audience": "toddler",
  "ageMonths": 28,
  "texturePreference": "soft_bite",
  "excludedAllergenCodes": ["egg"],
  "mealTypes": ["dinner"],
  "familySplitPreferred": true,
  "freezerFriendlyPreferred": false,
  "maxActiveTime": 10
}
```

하드 필터 순서:

```text
기존 출판 승인
→ 아동식 출판 승인
→ audience
→ ageMonths
→ excludedAllergenCodes
→ 식감과 시간
→ 추천 점수
```

## 6. 화면

### 홈

상단 모드:

```text
집밥 | 이유식 | 유아식
```

유아식 홈 섹션:

- 지금 바로 가능
- 아이 몫 먼저 덜면 온 가족이 같이
- 한 번 만들어 두기

### 목록 필터

- 24~29개월
- 30~36개월
- 아침·점심·저녁·간식
- 손가는 시간 10분 이하
- 한 그릇
- 가족식 같이
- 한 냄비
- 냉동 가능
- 부드럽게 씹기
- 가족식 크기
- 알레르겐 제외

### 상세

표시 순서:

1. 월령·식감·시간
2. 알레르겐과 질식 위험
3. 아이에게 제공할 모양
4. 가족식 분리 시점
5. 재료
6. 시작 제공량 예시
7. 조리 단계
8. 복구 팁
9. 편식 대응
10. 보관·재가열
11. 출처·검수

### 조리 모드

각 단계:

- 행동
- 불 세기
- 최소·최대 시간
- 타이머
- 완료 신호
- 안전 주의
- 흔한 실수
- 복구 방법
- 아이 몫 덜기 체크

## 7. 콘텐츠 1차 12개

1. 부드러운 두부달걀덮밥
2. 소고기 브로콜리 촉촉덮밥
3. 닭고기 애호박 촉촉밥
4. 토마토 달걀볶음밥
5. 버섯 채소 달걀찜
6. 단호박 두부밥
7. 바나나 오트 달걀전
8. 고구마 치즈 매시 토스트
9. 사과 오트밀
10. 두부 바나나 팬케이크
11. 아이 몫 먼저 소고기무국
12. 아이 몫 먼저 닭감자조림

모두 최초 상태:

```text
publishStatus = draft
actualCookingTested = false
foodSafetyReviewed = false
childFeedingReviewed = false
imageRightsStatus = unverified
requirementsVerified = false
publishedAt = null
```

## 8. 자동 검수

Create: `scripts/validate-child-recipes.mjs`

실패 조건:

- child guidance 없음
- 월령 범위 오류
- 허용되지 않은 알레르겐 코드
- 재료와 알레르겐 메타 불일치
- 달걀·고기·생선에 완전 가열 신호 없음
- 생선에 가시 확인 없음
- 통포도·방울토마토·소시지·통견과류·팝콘·단단한 생채소를 안전 수정 없이 포함
- 가족식 분리인데 분리 단계 없음
- 나트륨 전략 없음
- 단계 3개 미만
- 단계별 시간·불 세기·완료 신호·복구 팁 누락
- 보관·재가열 누락
- 공식 안전 출처 없음
- 실제 조리·식품안전·아동식·이미지 권리 검수 미완료 상태에서 공개됨
- 건강 효능 보장 표현

## 9. 이미지

레시피당:

- 대표 이미지 4:3
- 식감 확대 이미지
- 안전 모양 비교
- 핵심 단계 2~4장
- 가족식 분리 전후

정책:

- 실제 조리 사진 우선
- 외부 블로그·영상 이미지 무단 사용 금지
- 생성 이미지는 개발용 placeholder로만 사용
- 공개 식감 증거로 단독 사용 금지
- 실제 결과와 비교 검수

## 10. 테스트

### 단위

- 냉장고 0/1/6/7/12/13/15개
- 설정 파싱 복구
- 알레르겐 코드 검증
- 월령 하드 필터
- 아동식 승인 하드 필터
- 가족식 분리 단계
- 생선 가시 안내
- 질식 위험 validator

### API

- 잘못된 audience 400
- ageMonths 5/73 400
- 알 수 없는 allergen 400
- 미승인 guidance 노출 0
- 제외 알레르겐 노출 0
- 성인 API 회귀 없음
- rate limit·no-store·request ID 유지

### E2E

- 유아식 첫 진입
- 월령 저장
- 달걀 제외
- 달걀 레시피 미노출
- 상세 안전 패널
- 가족식 아이 몫 덜기
- 냉장고 6열
- 빈 결과에서 안전 필터 유지

## 11. 실행 순서

```text
Phase 0 기준선과 기능 플래그
Phase 1 냉장고 6열
Phase 2 아동식 타입·로컬 설정
Phase 3 DB migration·rollback·RLS
Phase 4 API
Phase 5 홈·목록·상세·조리·장보기
Phase 6 식단·피드백
Phase 7 콘텐츠 12개 실제 조리·검수·사진
Phase 8 Preview·E2E·실제 기기·Production
```

각 Phase 후:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:content
pnpm child-content:validate
pnpm build
```

## 12. Definition of Done

- [ ] 냉장고 6열 공용 컴포넌트
- [ ] 320~430px 시각 회귀 테스트
- [ ] 아동식 타입·로컬 설정
- [ ] guidance migration·rollback·RLS
- [ ] 목록·상세·추천 API
- [ ] 유아식 모드와 필터
- [ ] 안전한 제공 모양
- [ ] 가족식 아이 몫 분리
- [ ] 장보기와 주간 식단
- [ ] 저압박 피드백
- [ ] 콘텐츠 validator
- [ ] 12개 실제 조리
- [ ] 12개 식품안전 검수
- [ ] 12개 아동식 검수
- [ ] 12개 이미지 권리 검수
- [ ] 전체 테스트 통과
- [ ] Preview E2E
- [ ] iOS·Android 실제 기기
- [ ] Production migration
- [ ] 기능 플래그 ON
- [ ] 롤백 확인
