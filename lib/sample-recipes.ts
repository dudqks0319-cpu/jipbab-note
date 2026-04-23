// API 키가 없는 개발/오프라인 환경에서도 핵심 UX가 비어 보이지 않도록 하는 기본 레시피입니다.
import type { RecipeCategory, RecipeDetailRecord, RecipeRecord } from "@/types";

export const SAMPLE_RECIPES: RecipeDetailRecord[] = [
  {
    id: "sample-kimchi-jjigae",
    name: "김치찌개",
    category: "한식",
    method: "끓이기",
    calories: "420",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=900&q=80",
    ingredients: "김치 1컵, 돼지고기 150g, 두부 1/2모, 대파 1대, 마늘 1쪽, 고춧가루 1큰술",
    hashTag: "#한식 #찌개 #냉장고파먹기",
    ingredientList: ["김치 1컵", "돼지고기 150g", "두부 1/2모", "대파 1대", "마늘 1쪽", "고춧가루 1큰술"],
    steps: [
      { index: 1, description: "냄비에 돼지고기와 김치를 넣고 중불에서 볶습니다.", imageUrl: null },
      { index: 2, description: "물을 붓고 고춧가루와 마늘을 넣어 10분 정도 끓입니다.", imageUrl: null },
      { index: 3, description: "두부와 대파를 넣고 한소끔 더 끓인 뒤 간을 맞춥니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-egg-roll",
    name: "계란말이",
    category: "반찬",
    method: "부치기",
    calories: "230",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80",
    ingredients: "계란 3개, 대파 1/3대, 당근 조금, 소금 약간, 식용유 1큰술",
    hashTag: "#반찬 #간편식",
    ingredientList: ["계란 3개", "대파 1/3대", "당근 조금", "소금 약간", "식용유 1큰술"],
    steps: [
      { index: 1, description: "계란을 풀고 다진 대파와 당근, 소금을 섞습니다.", imageUrl: null },
      { index: 2, description: "팬에 기름을 두르고 계란물을 얇게 부어 말아줍니다.", imageUrl: null },
      { index: 3, description: "먹기 좋은 크기로 썰어 담습니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-soy-pasta",
    name: "간장 버터 파스타",
    category: "양식",
    method: "볶기",
    calories: "510",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80",
    ingredients: "파스타면 1인분, 간장 1큰술, 버터 1조각, 마늘 2쪽, 양파 1/4개",
    hashTag: "#양식 #면요리 #간편식",
    ingredientList: ["파스타면 1인분", "간장 1큰술", "버터 1조각", "마늘 2쪽", "양파 1/4개"],
    steps: [
      { index: 1, description: "파스타면을 삶고 면수는 조금 남겨둡니다.", imageUrl: null },
      { index: 2, description: "팬에 버터, 마늘, 양파를 볶다가 면과 간장을 넣습니다.", imageUrl: null },
      { index: 3, description: "면수로 농도를 맞추고 가볍게 섞어 마무리합니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-fried-rice",
    name: "김치볶음밥",
    category: "밥",
    method: "볶기",
    calories: "560",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
    ingredients: "밥 1공기, 김치 1/2컵, 계란 1개, 대파 1/2대, 참기름 1작은술",
    hashTag: "#밥 #한식 #자투리재료",
    ingredientList: ["밥 1공기", "김치 1/2컵", "계란 1개", "대파 1/2대", "참기름 1작은술"],
    steps: [
      { index: 1, description: "대파와 김치를 잘게 썰어 팬에서 볶습니다.", imageUrl: null },
      { index: 2, description: "밥을 넣고 고르게 볶은 뒤 참기름을 둘러줍니다.", imageUrl: null },
      { index: 3, description: "계란 프라이를 올려 마무리합니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-miso-soup",
    name: "두부 된장국",
    category: "국·찌개",
    method: "끓이기",
    calories: "180",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
    ingredients: "두부 1/2모, 된장 1큰술, 애호박 1/4개, 양파 1/4개, 대파 1/2대",
    hashTag: "#국찌개 #한식",
    ingredientList: ["두부 1/2모", "된장 1큰술", "애호박 1/4개", "양파 1/4개", "대파 1/2대"],
    steps: [
      { index: 1, description: "물에 된장을 풀고 양파와 애호박을 넣어 끓입니다.", imageUrl: null },
      { index: 2, description: "두부를 넣고 5분 정도 더 끓입니다.", imageUrl: null },
      { index: 3, description: "대파를 넣고 간을 맞춰 마무리합니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-chicken-salad",
    name: "닭가슴살 샐러드",
    category: "샐러드",
    method: "무치기",
    calories: "310",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    ingredients: "닭가슴살 1팩, 양상추 2줌, 오이 1/2개, 토마토 1개, 올리브오일 1큰술",
    hashTag: "#샐러드 #건강식",
    ingredientList: ["닭가슴살 1팩", "양상추 2줌", "오이 1/2개", "토마토 1개", "올리브오일 1큰술"],
    steps: [
      { index: 1, description: "닭가슴살을 데우거나 구워 한입 크기로 자릅니다.", imageUrl: null },
      { index: 2, description: "채소를 씻어 물기를 빼고 먹기 좋게 자릅니다.", imageUrl: null },
      { index: 3, description: "재료를 담고 올리브오일을 가볍게 둘러 섞습니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-tomato-egg-stirfry",
    name: "토마토 계란볶음",
    category: "중식",
    method: "볶기",
    calories: "260",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1604908176997-4318f16e7f00?auto=format&fit=crop&w=900&q=80",
    ingredients: "토마토 1개, 계란 2개, 대파 1/3대, 굴소스 1작은술, 식용유 1큰술",
    hashTag: "#중식 #계란 #간편식",
    ingredientList: ["토마토 1개", "계란 2개", "대파 1/3대", "굴소스 1작은술", "식용유 1큰술"],
    steps: [
      { index: 1, description: "계란을 먼저 부드럽게 볶아 덜어둡니다.", imageUrl: null },
      { index: 2, description: "대파와 토마토를 볶다가 굴소스로 간합니다.", imageUrl: null },
      { index: 3, description: "계란을 다시 넣고 가볍게 섞습니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-curry-udon",
    name: "카레 우동",
    category: "일식",
    method: "끓이기",
    calories: "520",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1618841557871-b4664fbf0cb3?auto=format&fit=crop&w=900&q=80",
    ingredients: "우동면 1개, 카레가루 2큰술, 양파 1/4개, 대파 1/3대, 계란 1개",
    hashTag: "#일식 #면요리",
    ingredientList: ["우동면 1개", "카레가루 2큰술", "양파 1/4개", "대파 1/3대", "계란 1개"],
    steps: [
      { index: 1, description: "양파와 대파를 볶다가 물을 붓고 끓입니다.", imageUrl: null },
      { index: 2, description: "카레가루를 풀고 우동면을 넣어 익힙니다.", imageUrl: null },
      { index: 3, description: "계란을 올리거나 풀어 넣어 마무리합니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-tteokbokki",
    name: "간단 떡볶이",
    category: "분식",
    method: "끓이기",
    calories: "480",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1635363638580-c2809d049eee?auto=format&fit=crop&w=900&q=80",
    ingredients: "떡 2줌, 고추장 1큰술, 설탕 1큰술, 대파 1/2대, 어묵 2장",
    hashTag: "#분식 #매콤",
    ingredientList: ["떡 2줌", "고추장 1큰술", "설탕 1큰술", "대파 1/2대", "어묵 2장"],
    steps: [
      { index: 1, description: "물에 고추장과 설탕을 풀어 끓입니다.", imageUrl: null },
      { index: 2, description: "떡과 어묵을 넣고 양념이 배도록 졸입니다.", imageUrl: null },
      { index: 3, description: "대파를 넣고 한 번 더 끓여 마무리합니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-banana-pancake",
    name: "바나나 팬케이크",
    category: "디저트",
    method: "굽기",
    calories: "360",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80",
    ingredients: "바나나 1개, 계란 1개, 밀가루 1/2컵, 우유 1/2컵, 버터 1조각",
    hashTag: "#디저트 #간식",
    ingredientList: ["바나나 1개", "계란 1개", "밀가루 1/2컵", "우유 1/2컵", "버터 1조각"],
    steps: [
      { index: 1, description: "바나나를 으깨고 계란, 밀가루, 우유와 섞습니다.", imageUrl: null },
      { index: 2, description: "팬에 버터를 녹이고 반죽을 노릇하게 굽습니다.", imageUrl: null },
      { index: 3, description: "남은 바나나를 올려 마무리합니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-noodle-soup",
    name: "잔치국수",
    category: "면요리",
    method: "삶기",
    calories: "430",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    ingredients: "소면 1인분, 계란 1개, 애호박 조금, 당근 조금, 간장 1큰술",
    hashTag: "#면요리 #한식",
    ingredientList: ["소면 1인분", "계란 1개", "애호박 조금", "당근 조금", "간장 1큰술"],
    steps: [
      { index: 1, description: "소면을 삶아 찬물에 헹굽니다.", imageUrl: null },
      { index: 2, description: "채소와 계란 지단을 준비합니다.", imageUrl: null },
      { index: 3, description: "국물과 고명을 올리고 간장 양념을 곁들입니다.", imageUrl: null },
    ],
  },
  {
    id: "sample-rice-ball",
    name: "참치 주먹밥",
    category: "기타",
    method: "섞기",
    calories: "390",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80",
    ingredients: "밥 1공기, 참치캔 1/2개, 김가루 1줌, 마요네즈 1큰술, 참기름 1작은술",
    hashTag: "#간편식 #도시락",
    ingredientList: ["밥 1공기", "참치캔 1/2개", "김가루 1줌", "마요네즈 1큰술", "참기름 1작은술"],
    steps: [
      { index: 1, description: "참치의 기름을 빼고 밥, 김가루와 섞습니다.", imageUrl: null },
      { index: 2, description: "마요네즈와 참기름을 넣어 간을 맞춥니다.", imageUrl: null },
      { index: 3, description: "한입 크기로 뭉쳐 담습니다.", imageUrl: null },
    ],
  },
];

const toRecord = (recipe: RecipeDetailRecord): RecipeRecord => ({
  id: recipe.id,
  name: recipe.name,
  category: recipe.category,
  method: recipe.method,
  calories: recipe.calories,
  thumbnailUrl: recipe.thumbnailUrl,
  ingredients: recipe.ingredients,
  hashTag: recipe.hashTag,
});

export function getSampleRecipeRecords(
  searchQuery = "",
  selectedCategory: RecipeCategory = "전체",
): RecipeRecord[] {
  const query = searchQuery.trim().toLowerCase();

  return SAMPLE_RECIPES.filter((recipe) => {
    const categoryMatches = selectedCategory === "전체" || recipe.category === selectedCategory;
    if (!categoryMatches) {
      return false;
    }

    if (!query) {
      return true;
    }

    return `${recipe.name} ${recipe.category} ${recipe.ingredients} ${recipe.hashTag}`.toLowerCase().includes(query);
  }).map(toRecord);
}

export function getSampleRecipeDetail(recipeId: string): RecipeDetailRecord | null {
  return SAMPLE_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}
