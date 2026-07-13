// 이 파일은 이유식·유아식 조사 결과를 공개 전 검수 후보로 구조화하고 안전 경계를 검사합니다.

export type InfantToddlerStage = "4~6개월" | "6~8개월" | "8~11개월" | "12개월 이상";
export type InfantToddlerReliability = "A" | "A-" | "B";

export type InfantToddlerRecipeCandidate = {
  id: string;
  name: string;
  ageLabel: string;
  minimumAgeMonths: number;
  stage: InfantToddlerStage;
  difficulty: "초보" | "중급";
  timeLabel: string;
  ingredients: string[];
  preparationSummary: string[];
  allergens: string[];
  storageNote: string;
  sourceName: string;
  sourceType: "private_platform" | "government_repost" | "government_index" | "magazine";
  sourceUsage: "summary_only";
  rightsNote: string;
  reliability: InfantToddlerReliability;
  quantityStatus: "recorded" | "partial" | "source_review_required";
  publicationStatus: "research_only";
  imageUrl: null;
  safetyNotes: string[];
};

type CandidateInput = Omit<
  InfantToddlerRecipeCandidate,
  "publicationStatus" | "sourceUsage" | "imageUrl" | "safetyNotes"
>;

const NEW_FOOD_NOTE = "새 재료는 한 번에 하나씩 도입하고 설사·발진·구토 등 반응을 확인해 주세요.";
const GUARDIAN_NOTE = "월령은 참고 기준이며 아이의 발달과 섭식 상태를 보호자와 소아청소년과가 함께 판단해 주세요.";
const HONEY_NOTE = "만 12개월 전에는 꿀과 꿀이 든 가공식품을 주지 마세요.";
const ALLERGY_NOTE = "표시된 알레르기 식품은 처음 제공할 때 소량으로 반응을 관찰해 주세요.";
const STORAGE_PENDING = "냉장·냉동 보관 시간과 재가열 기준은 실제 조리 및 식품안전 검수 후 확정합니다.";

function candidate(input: CandidateInput): InfantToddlerRecipeCandidate {
  return {
    ...input,
    sourceUsage: "summary_only",
    publicationStatus: "research_only",
    imageUrl: null,
    safetyNotes: [
      NEW_FOOD_NOTE,
      GUARDIAN_NOTE,
      ...(input.minimumAgeMonths < 12 ? [HONEY_NOTE] : []),
      ...(input.allergens.length > 0 ? [ALLERGY_NOTE] : []),
    ],
  };
}

const PRIVATE_RIGHTS = "외부 플랫폼의 원문·사진·영상은 사용하지 않고 메뉴 아이디어와 사실 정보만 검수 후보로 기록";
const GOVERNMENT_REPOST_RIGHTS = "정부 명의 재게시물이지만 원문 라이선스와 플랫폼 이용조건을 모두 확인하기 전에는 요약만 허용";
const GOVERNMENT_INDEX_RIGHTS = "정부 자료로 보이나 원문 라이선스 직접 확인 전에는 요약만 허용";

export const INFANT_TODDLER_RECIPE_CANDIDATES: InfantToddlerRecipeCandidate[] = [
  candidate({
    id: "infant-rice-gruel",
    name: "쌀미음",
    ageLabel: "4~6개월",
    minimumAgeMonths: 4,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["불린 쌀 20g", "물 140ml"],
    preparationSummary: ["쌀을 충분히 불려 곱게 갑니다.", "약불에서 저어가며 묽게 끓이고 입자를 확인합니다."],
    allergens: [],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 인쇄본 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-glutinous-rice-gruel",
    name: "찹쌀미음",
    ageLabel: "4~6개월",
    minimumAgeMonths: 4,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["불린 찹쌀 — 정량 검수 필요", "물 — 정량 검수 필요"],
    preparationSummary: ["찹쌀을 불린 뒤 곱게 갑니다.", "약불에서 저어 끓이고 월령에 맞게 입자를 조정합니다."],
    allergens: [],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "source_review_required",
  }),
  candidate({
    id: "infant-broccoli-gruel",
    name: "브로콜리미음",
    ageLabel: "4~6개월",
    minimumAgeMonths: 4,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "60분 내",
    ingredients: ["브로콜리 3g", "불린 찹쌀 6g", "물 0.4컵"],
    preparationSummary: ["브로콜리를 충분히 익힙니다.", "찹쌀과 함께 끓인 뒤 월령에 맞게 곱게 거릅니다."],
    allergens: [],
    storageNote: STORAGE_PENDING,
    sourceName: "식품의약품안전처 계정 게시물 참고",
    sourceType: "government_repost",
    rightsNote: GOVERNMENT_REPOST_RIGHTS,
    reliability: "A",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-potato-gruel",
    name: "감자미음",
    ageLabel: "4~6개월",
    minimumAgeMonths: 4,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["쌀 12g", "감자 10g", "물 250ml"],
    preparationSummary: ["감자를 속까지 충분히 익힙니다.", "쌀과 함께 묽게 끓여 곱게 갈고 입자를 확인합니다."],
    allergens: [],
    storageNote: "보고서에 냉장 2일 사례가 있으나 식품안전 검수 전에는 당일 섭취를 우선합니다.",
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-cabbage-gruel",
    name: "양배추미음",
    ageLabel: "4~6개월",
    minimumAgeMonths: 4,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["쌀가루 15g", "양배추 — 정량 검수 필요", "물 — 정량 검수 필요"],
    preparationSummary: ["양배추를 부드럽게 익힙니다.", "쌀가루와 함께 묽게 끓여 입자를 확인합니다."],
    allergens: [],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "partial",
  }),
  candidate({
    id: "infant-zucchini-gruel",
    name: "애호박미음",
    ageLabel: "4~6개월",
    minimumAgeMonths: 4,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["쌀가루 10g", "애호박 10g", "물 200ml"],
    preparationSummary: ["애호박의 단단한 껍질과 씨를 제거합니다.", "쌀가루와 끓인 뒤 필요하면 곱게 거릅니다."],
    allergens: [],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-apple-gruel",
    name: "사과미음",
    ageLabel: "4~6개월 후반",
    minimumAgeMonths: 5,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["불린 쌀 15g", "사과 10g", "물 1컵"],
    preparationSummary: ["사과를 가열해 부드럽게 익힙니다.", "쌀과 곱게 갈아 약불에서 묽게 끓입니다."],
    allergens: [],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-bokchoy-apple-gruel",
    name: "청경채사과미음",
    ageLabel: "4~6개월 후반",
    minimumAgeMonths: 5,
    stage: "4~6개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["불린 쌀 15g", "사과 10g", "청경채 5g"],
    preparationSummary: ["청경채와 사과를 충분히 익힙니다.", "쌀과 곱게 갈아 다시 가열하고 입자를 확인합니다."],
    allergens: [],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-beef-gruel",
    name: "소고기미음",
    ageLabel: "6개월 이상",
    minimumAgeMonths: 6,
    stage: "6~8개월",
    difficulty: "초보",
    timeLabel: "15~30분",
    ingredients: ["쌀가루 18g", "소고기 15g", "무염 소고기 육수 200ml"],
    preparationSummary: ["소고기를 중심까지 완전히 익혀 곱게 다집니다.", "쌀가루와 무염 육수에 넣어 묽게 끓입니다."],
    allergens: ["소고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-beef-zucchini-gruel",
    name: "소고기애호박미음",
    ageLabel: "6개월 이상",
    minimumAgeMonths: 6,
    stage: "6~8개월",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["소고기 10g", "애호박 — 정량 검수 필요", "쌀 — 정량 검수 필요", "물 — 정량 검수 필요"],
    preparationSummary: ["소고기와 애호박을 각각 충분히 익힙니다.", "쌀과 함께 끓여 월령에 맞게 곱게 만듭니다."],
    allergens: ["소고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "partial",
  }),
  candidate({
    id: "infant-beef-apple-gruel",
    name: "소고기사과미음",
    ageLabel: "6개월 이상",
    minimumAgeMonths: 6,
    stage: "6~8개월",
    difficulty: "초보",
    timeLabel: "60분 내",
    ingredients: ["쌀 25g", "소고기 — 정량 검수 필요", "사과 — 정량 검수 필요", "물 — 정량 검수 필요"],
    preparationSummary: ["소고기를 완전히 익히고 사과를 부드럽게 가열합니다.", "쌀과 함께 끓여 월령에 맞는 미음으로 만듭니다."],
    allergens: ["소고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "partial",
  }),
  candidate({
    id: "infant-beef-potato-porridge",
    name: "소고기감자죽",
    ageLabel: "6~8개월",
    minimumAgeMonths: 6,
    stage: "6~8개월",
    difficulty: "중급",
    timeLabel: "60분 내",
    ingredients: ["다진 소고기 3g", "감자 4g", "불린 쌀 6g", "물 0.2컵"],
    preparationSummary: ["소고기와 감자를 중심까지 익힙니다.", "불린 쌀과 함께 부드러운 죽으로 끓여 입자를 확인합니다."],
    allergens: ["소고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "식품의약품안전처 계정 게시물 참고",
    sourceType: "government_repost",
    rightsNote: GOVERNMENT_REPOST_RIGHTS,
    reliability: "A",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-beef-spinach-porridge",
    name: "소고기시금치죽",
    ageLabel: "6~8개월",
    minimumAgeMonths: 6,
    stage: "6~8개월",
    difficulty: "중급",
    timeLabel: "60분 내",
    ingredients: ["다진 소고기 4.5g", "데친 시금치 3g", "불린 쌀 9g", "물 0.6컵"],
    preparationSummary: ["시금치를 데치고 소고기를 완전히 익힙니다.", "불린 쌀과 함께 끓여 부드러운 입자로 만듭니다."],
    allergens: ["소고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "식품의약품안전처 계정 게시물 참고",
    sourceType: "government_repost",
    rightsNote: GOVERNMENT_REPOST_RIGHTS,
    reliability: "A",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "infant-chicken-broccoli-tofu-porridge",
    name: "닭브로콜리두부죽",
    ageLabel: "7~8개월",
    minimumAgeMonths: 7,
    stage: "6~8개월",
    difficulty: "초보",
    timeLabel: "시간 검수 필요",
    ingredients: ["닭고기 — 정량 검수 필요", "브로콜리 — 정량 검수 필요", "두부 — 정량 검수 필요", "쌀 또는 밥 — 정량 검수 필요"],
    preparationSummary: ["닭고기와 브로콜리를 완전히 익힙니다.", "두부와 쌀을 더해 부드러운 죽으로 끓입니다."],
    allergens: ["닭고기", "콩"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 목록 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "source_review_required",
  }),
  candidate({
    id: "infant-chicken-vegetable-soft-rice",
    name: "닭완두콩당근양파무른밥",
    ageLabel: "8~10개월",
    minimumAgeMonths: 8,
    stage: "8~11개월",
    difficulty: "초보",
    timeLabel: "시간 검수 필요",
    ingredients: ["닭고기 — 정량 검수 필요", "완두콩 — 정량 검수 필요", "당근 — 정량 검수 필요", "양파 — 정량 검수 필요", "무른밥 — 정량 검수 필요"],
    preparationSummary: ["닭고기와 채소를 완전히 익혀 월령에 맞게 잘게 다집니다.", "무른밥과 섞어 충분히 부드럽게 끓입니다."],
    allergens: ["닭고기", "콩"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 목록 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "source_review_required",
  }),
  candidate({
    id: "infant-white-fish-corn-egg-rice",
    name: "흰살생선옥수수달걀진밥",
    ageLabel: "9개월 이상",
    minimumAgeMonths: 9,
    stage: "8~11개월",
    difficulty: "중급",
    timeLabel: "시간 검수 필요",
    ingredients: ["흰살생선 — 정량 검수 필요", "옥수수 — 정량 검수 필요", "달걀 — 정량 검수 필요", "진밥 — 정량 검수 필요"],
    preparationSummary: ["생선 가시를 완전히 제거하고 달걀과 함께 충분히 익힙니다.", "월령에 맞게 잘게 다져 진밥과 섞습니다."],
    allergens: ["생선", "달걀"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 목록 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "source_review_required",
  }),
  candidate({
    id: "infant-pumpkin-beef-soft-rice",
    name: "단호박양파소고기무른밥",
    ageLabel: "9~11개월",
    minimumAgeMonths: 9,
    stage: "8~11개월",
    difficulty: "중급",
    timeLabel: "시간 검수 필요",
    ingredients: ["단호박 — 정량 검수 필요", "양파 — 정량 검수 필요", "소고기 — 정량 검수 필요", "무른밥 — 정량 검수 필요"],
    preparationSummary: ["단호박·양파·소고기를 완전히 익혀 잘게 다집니다.", "무른밥과 섞어 덩어리 크기를 확인합니다."],
    allergens: ["소고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "식품의약품안전처 브랜드 목록 참고",
    sourceType: "government_index",
    rightsNote: GOVERNMENT_INDEX_RIGHTS,
    reliability: "A-",
    quantityStatus: "source_review_required",
  }),
  candidate({
    id: "infant-mushroom-chicken-soft-rice",
    name: "양송이버섯양파닭고기무른밥",
    ageLabel: "9~11개월",
    minimumAgeMonths: 9,
    stage: "8~11개월",
    difficulty: "중급",
    timeLabel: "시간 검수 필요",
    ingredients: ["양송이버섯 — 정량 검수 필요", "양파 — 정량 검수 필요", "닭고기 — 정량 검수 필요", "무른밥 — 정량 검수 필요"],
    preparationSummary: ["버섯·양파·닭고기를 충분히 익혀 잘게 다집니다.", "무른밥과 섞어 월령에 맞는 입자로 만듭니다."],
    allergens: ["닭고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "식품의약품안전처 브랜드 목록 참고",
    sourceType: "government_index",
    rightsNote: GOVERNMENT_INDEX_RIGHTS,
    reliability: "A-",
    quantityStatus: "source_review_required",
  }),
  candidate({
    id: "toddler-beef-vegetable-rice-ball",
    name: "쇠고기야채주먹밥",
    ageLabel: "12개월 이상",
    minimumAgeMonths: 12,
    stage: "12개월 이상",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["다진 소고기 80g", "애호박·표고·감자·시금치·당근 각 소량", "무염 육수 3큰술", "밥 — 정량 검수 필요"],
    preparationSummary: ["소고기와 채소를 완전히 익혀 작은 크기로 다집니다.", "밥과 섞어 아이가 삼키기 안전한 작은 크기로 뭉칩니다."],
    allergens: ["소고기"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "partial",
  }),
  candidate({
    id: "toddler-tofu-porridge",
    name: "두부죽",
    ageLabel: "12개월 이상",
    minimumAgeMonths: 12,
    stage: "12개월 이상",
    difficulty: "초보",
    timeLabel: "시간 검수 필요",
    ingredients: ["두부 — 정량 검수 필요", "쌀 또는 밥 — 정량 검수 필요", "물 — 정량 검수 필요"],
    preparationSummary: ["두부를 충분히 가열해 부드럽게 으깹니다.", "쌀 또는 밥과 끓여 삼키기 쉬운 농도로 만듭니다."],
    allergens: ["콩"],
    storageNote: STORAGE_PENDING,
    sourceName: "완료기 이유식 매거진 목록 참고",
    sourceType: "magazine",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "source_review_required",
  }),
  candidate({
    id: "toddler-chicken-egg-rice-bowl",
    name: "닭고기계란덮밥",
    ageLabel: "12개월 이상",
    minimumAgeMonths: 12,
    stage: "12개월 이상",
    difficulty: "초보",
    timeLabel: "30분 내",
    ingredients: ["닭안심 2개", "양송이버섯 1개", "양파 1/6개", "당근 1토막", "시금치 약간", "달걀 — 정량 검수 필요", "밥 — 정량 검수 필요"],
    preparationSummary: ["채소와 닭고기를 작게 썰어 완전히 익힙니다.", "달걀을 넣어 완전히 익힌 뒤 밥 위에 부드럽게 얹습니다."],
    allergens: ["닭고기", "달걀"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "partial",
  }),
  candidate({
    id: "toddler-anchovy-rice-ball",
    name: "멸치주먹밥",
    ageLabel: "12개월 이상",
    minimumAgeMonths: 12,
    stage: "12개월 이상",
    difficulty: "중급",
    timeLabel: "60분 내",
    ingredients: ["밥 80g", "지리멸치 5g", "아몬드 4g", "김가루 2g", "김치 8g", "마요네즈 4g", "올리고당 3g"],
    preparationSummary: ["멸치의 염분을 줄이고 아몬드는 질식 위험이 없도록 매우 곱게 갑니다.", "모든 재료를 완전히 익혀 작은 주먹밥으로 만들며 나트륨·당 첨가량을 재검수합니다."],
    allergens: ["생선", "견과류", "달걀"],
    storageNote: STORAGE_PENDING,
    sourceName: "식품의약품안전처 계정 게시물 참고",
    sourceType: "government_repost",
    rightsNote: GOVERNMENT_REPOST_RIGHTS,
    reliability: "A",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "toddler-clear-okara-stew",
    name: "맑은비지찌개",
    ageLabel: "12개월 이상",
    minimumAgeMonths: 12,
    stage: "12개월 이상",
    difficulty: "중급",
    timeLabel: "60분 내",
    ingredients: ["콩비지 30g", "돼지고기 9g", "배춧잎 3g", "멸치육수 0.5L", "맛술·새우젓·다진 마늘 소량"],
    preparationSummary: ["돼지고기를 중심까지 완전히 익힙니다.", "비지·육수·배추를 넣어 끓이고 새우젓·맛술·염도는 유아용으로 재검수합니다."],
    allergens: ["콩", "돼지고기", "새우", "생선"],
    storageNote: STORAGE_PENDING,
    sourceName: "식품의약품안전처 계정 게시물 참고",
    sourceType: "government_repost",
    rightsNote: GOVERNMENT_REPOST_RIGHTS,
    reliability: "A",
    quantityStatus: "recorded",
  }),
  candidate({
    id: "toddler-shrimp-soft-tofu-soup",
    name: "새우순두부국",
    ageLabel: "12개월 이상",
    minimumAgeMonths: 12,
    stage: "12개월 이상",
    difficulty: "초보",
    timeLabel: "시간 검수 필요",
    ingredients: ["새우 — 정량 검수 필요", "순두부 — 정량 검수 필요", "무염 육수 — 정량 검수 필요"],
    preparationSummary: ["새우의 껍질과 내장을 제거하고 중심까지 완전히 익힙니다.", "순두부와 무염 육수에 부드럽게 끓여 염도를 확인합니다."],
    allergens: ["새우", "콩"],
    storageNote: STORAGE_PENDING,
    sourceName: "만개의레시피 목록 참고",
    sourceType: "private_platform",
    rightsNote: PRIVATE_RIGHTS,
    reliability: "B",
    quantityStatus: "source_review_required",
  }),
];

export const INFANT_TODDLER_STAGE_COUNTS: Record<InfantToddlerStage, number> = {
  "4~6개월": INFANT_TODDLER_RECIPE_CANDIDATES.filter((recipe) => recipe.stage === "4~6개월").length,
  "6~8개월": INFANT_TODDLER_RECIPE_CANDIDATES.filter((recipe) => recipe.stage === "6~8개월").length,
  "8~11개월": INFANT_TODDLER_RECIPE_CANDIDATES.filter((recipe) => recipe.stage === "8~11개월").length,
  "12개월 이상": INFANT_TODDLER_RECIPE_CANDIDATES.filter((recipe) => recipe.stage === "12개월 이상").length,
};

export function canPublishInfantToddlerRecipe(_recipe: InfantToddlerRecipeCandidate): false {
  // 실제 조리·의학·권리·이미지 검수 증거 스키마가 추가되기 전까지 공개 승격을 허용하지 않습니다.
  void _recipe;
  return false;
}

export function validateInfantToddlerRecipeCandidate(recipe: InfantToddlerRecipeCandidate): string[] {
  const issues: string[] = [];
  if (!recipe.id.startsWith("infant-") && !recipe.id.startsWith("toddler-")) issues.push("invalid id");
  if (!recipe.name.trim()) issues.push("missing name");
  if (recipe.ingredients.length < 2) issues.push("insufficient ingredients");
  if (recipe.preparationSummary.length < 2) issues.push("insufficient preparation summary");
  if (recipe.publicationStatus !== "research_only") issues.push("publication must remain research_only");
  if (recipe.sourceUsage !== "summary_only") issues.push("source usage must remain summary_only");
  if (recipe.imageUrl !== null) issues.push("external image is not allowed");
  if (!recipe.rightsNote.trim()) issues.push("missing rights note");
  if (!recipe.safetyNotes.includes(NEW_FOOD_NOTE) || !recipe.safetyNotes.includes(GUARDIAN_NOTE)) {
    issues.push("missing common safety boundary");
  }
  if (recipe.minimumAgeMonths < 12) {
    if (recipe.ingredients.some((ingredient) => ingredient.includes("꿀"))) issues.push("honey is forbidden under 12 months");
    if (!recipe.safetyNotes.includes(HONEY_NOTE)) issues.push("missing honey warning");
  }
  if (recipe.allergens.length > 0 && !recipe.safetyNotes.includes(ALLERGY_NOTE)) {
    issues.push("missing allergen warning");
  }
  return issues;
}

export type ChildMealGuidance = {
  audience: "infant" | "toddler";
  minimumAgeMonths: number | null;
  ageGuidanceStatus: "research" | "expert_reviewed";
  textureLevel: string;
  chokingHazards: string[];
  allergenIntroductionNotes: string[];
  sodiumPolicy: string | null;
  sugarPolicy: string | null;
  portionGuidance: string | null;
  caregiverWarnings: string[];
  medicalReviewStatus: "not_reviewed" | "expert_reviewed";
};

export type ChildMealResearchRecipe = {
  schemaVersion: 2;
  id: string;
  title: string;
  name: string;
  category: "child_meal_research";
  servings: null;
  totalMinutes: null;
  ingredientDetails: Array<{ name: string; display: string }>;
  steps: Array<{ order: number; action: string }>;
  source: {
    name: string;
    usage: "summary_only";
    rightsStatus: "needs_review";
  };
  childGuidance: ChildMealGuidance;
  publicationStatus: "research_only";
  featureFlag: "off";
};

function chokingHazardsFor(recipe: InfantToddlerRecipeCandidate): string[] {
  const text = recipe.ingredients.join(" ");
  const hazards = [
    ...(text.includes("견과") || text.includes("아몬드") ? ["견과류는 통째로 제공하지 않고 전문가가 승인한 입자로 조정"] : []),
    ...(text.includes("멸치") ? ["멸치 뼈와 단단한 조각 제거 필요"] : []),
    ...(text.includes("떡") ? ["떡의 점착성과 크기는 연하 전문가 검수 전 제공 금지"] : []),
  ];
  return hazards.length > 0 ? hazards : ["식감·입자·질식 위험 전문가 검수 필요"];
}

export const INFANT_TODDLER_RESEARCH_RECIPES: ChildMealResearchRecipe[] =
  INFANT_TODDLER_RECIPE_CANDIDATES.map((recipe) => ({
    schemaVersion: 2,
    id: recipe.id,
    title: recipe.name,
    name: recipe.name,
    category: "child_meal_research",
    servings: null,
    totalMinutes: null,
    ingredientDetails: recipe.ingredients.map((display) => ({
      name: display.split(" ")[0] ?? display,
      display,
    })),
    steps: recipe.preparationSummary.map((action, index) => ({ order: index + 1, action })),
    source: {
      name: recipe.sourceName,
      usage: "summary_only",
      rightsStatus: "needs_review",
    },
    childGuidance: {
      audience: recipe.minimumAgeMonths < 12 ? "infant" : "toddler",
      minimumAgeMonths: recipe.minimumAgeMonths,
      ageGuidanceStatus: "research",
      textureLevel: `${recipe.stage} 조사값 - 전문가 검수 필요`,
      chokingHazards: chokingHazardsFor(recipe),
      allergenIntroductionNotes: recipe.allergens.map((allergen) => `${allergen}: 보호자·전문가 확인 후 소량 도입`),
      sodiumPolicy: null,
      sugarPolicy: null,
      portionGuidance: null,
      caregiverWarnings: recipe.safetyNotes,
      medicalReviewStatus: "not_reviewed",
    },
    publicationStatus: "research_only",
    featureFlag: "off",
  }));
