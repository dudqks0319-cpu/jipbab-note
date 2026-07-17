import type {
  IngredientCatalogItem,
  IngredientCategory,
} from "../types/index.ts";

const CATALOG: IngredientCatalogItem[] = [
  { id: "veg-onion", category: "채소", name: "양파", aliases: ["흰양파", "적양파"], defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-green-onion", category: "채소", name: "대파", aliases: ["파", "굵은파", "쪽파"], defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-garlic", category: "채소", name: "마늘", aliases: ["통마늘", "깐마늘"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "veg-potato", category: "채소", name: "감자", aliases: ["수미감자"], defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "veg-sweet-potato", category: "채소", name: "고구마", aliases: ["밤고구마", "호박고구마"], defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "veg-carrot", category: "채소", name: "당근", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-zucchini", category: "채소", name: "애호박", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-cucumber", category: "채소", name: "오이", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-cabbage", category: "채소", name: "양배추", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-kimchi-cabbage", category: "채소", name: "배추", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-radish", category: "채소", name: "무", aliases: ["조선무"], defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-broccoli", category: "채소", name: "브로콜리", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-mushroom", category: "채소", name: "버섯", aliases: ["양송이버섯", "느타리버섯", "표고버섯"], defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "veg-spinach", category: "채소", name: "시금치", defaultStorageType: "냉장", defaultUnit: "bag" },
  { id: "veg-paprika", category: "채소", name: "파프리카", aliases: ["빨강 파프리카", "노랑 파프리카"], defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-lettuce", category: "채소", name: "상추", defaultStorageType: "냉장", defaultUnit: "bag" },
  { id: "veg-perilla-leaf", category: "채소", name: "깻잎", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "veg-bean-sprout", category: "채소", name: "콩나물", defaultStorageType: "냉장", defaultUnit: "bag" },
  { id: "veg-sprout", category: "채소", name: "숙주", aliases: ["숙주나물"], defaultStorageType: "냉장", defaultUnit: "bag" },
  { id: "veg-tomato-cherry", category: "채소", name: "방울토마토", aliases: ["체리토마토"], defaultStorageType: "냉장", defaultUnit: "pack" },

  { id: "fruit-apple", category: "과일", name: "사과", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-pear", category: "과일", name: "배", aliases: ["신고배"], defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-banana", category: "과일", name: "바나나", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-strawberry", category: "과일", name: "딸기", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "fruit-orange", category: "과일", name: "오렌지", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-tangerine", category: "과일", name: "귤", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-lemon", category: "과일", name: "레몬", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "fruit-lime", category: "과일", name: "라임", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "fruit-grape", category: "과일", name: "포도", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "fruit-blueberry", category: "과일", name: "블루베리", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "fruit-kiwi", category: "과일", name: "키위", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-mango", category: "과일", name: "망고", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-pineapple", category: "과일", name: "파인애플", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "fruit-avocado", category: "과일", name: "아보카도", defaultStorageType: "실온", defaultUnit: "piece" },

  { id: "meat-beef", category: "육류", name: "소고기", aliases: ["국거리"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-pork", category: "육류", name: "돼지고기", aliases: ["앞다리살", "뒷다리살"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-pork-belly", category: "육류", name: "삼겹살", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-pork-neck", category: "육류", name: "목살", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-beef-bulgogi", category: "육류", name: "불고기용 소고기", aliases: ["불고기"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-chicken", category: "육류", name: "닭고기", aliases: ["닭정육"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-chicken-breast", category: "육류", name: "닭가슴살", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "meat-chicken-leg", category: "육류", name: "닭다리", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "meat-duck", category: "육류", name: "오리고기", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-bacon", category: "육류", name: "베이컨", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "meat-ham", category: "육류", name: "햄", aliases: ["슬라이스햄"], defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "meat-sausage", category: "육류", name: "소시지", aliases: ["비엔나"], defaultStorageType: "냉장", defaultUnit: "pack" },

  { id: "sea-mackerel", category: "수산물", name: "고등어", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "sea-salmon", category: "수산물", name: "연어", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "sea-tuna", category: "수산물", name: "참치", aliases: ["생참치"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "sea-shrimp", category: "수산물", name: "새우", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "sea-squid", category: "수산물", name: "오징어", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "sea-octopus", category: "수산물", name: "문어", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "sea-anchovy", category: "수산물", name: "멸치", aliases: ["국물멸치"], defaultStorageType: "실온", defaultUnit: "g" },
  { id: "sea-kelp", category: "수산물", name: "다시마", defaultStorageType: "실온", defaultUnit: "sheet" },
  { id: "sea-seaweed", category: "수산물", name: "미역", defaultStorageType: "실온", defaultUnit: "g" },
  { id: "sea-clam", category: "수산물", name: "바지락", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "sea-pollack-roe", category: "수산물", name: "명란", aliases: ["명란젓"], defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "sea-fishcake", category: "수산물", name: "어묵", defaultStorageType: "냉장", defaultUnit: "pack" },

  { id: "dairy-milk", category: "유제품", name: "우유", defaultStorageType: "냉장", defaultUnit: "ml" },
  { id: "dairy-soy-milk", category: "유제품", name: "두유", defaultStorageType: "냉장", defaultUnit: "ml" },
  { id: "dairy-cheese", category: "유제품", name: "치즈", aliases: ["슬라이스치즈"], defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "dairy-mozzarella", category: "유제품", name: "모짜렐라치즈", aliases: ["모짜렐라"], defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "dairy-butter", category: "유제품", name: "버터", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "dairy-yogurt", category: "유제품", name: "요거트", aliases: ["플레인요거트"], defaultStorageType: "냉장", defaultUnit: "cup" },
  { id: "dairy-whipping-cream", category: "유제품", name: "생크림", aliases: ["휘핑크림"], defaultStorageType: "냉장", defaultUnit: "ml" },
  { id: "dairy-egg", category: "계란·난류", name: "계란", aliases: ["달걀"], defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "dairy-tofu", category: "콩·두부", name: "두부", defaultStorageType: "냉장", defaultUnit: "block" },
  { id: "dairy-cream-cheese", category: "유제품", name: "크림치즈", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "dairy-mayonnaise", category: "유제품", name: "마요네즈", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "dairy-parmesan", category: "유제품", name: "파마산치즈", aliases: ["파마산"], defaultStorageType: "냉장", defaultUnit: "g" },

  { id: "frozen-dumpling", category: "냉동식품", name: "냉동만두", defaultStorageType: "냉동", defaultUnit: "bag" },
  { id: "frozen-rice", category: "냉동식품", name: "냉동볶음밥", defaultStorageType: "냉동", defaultUnit: "pack" },
  { id: "frozen-pizza", category: "냉동식품", name: "냉동피자", defaultStorageType: "냉동", defaultUnit: "piece" },
  { id: "frozen-udon", category: "냉동식품", name: "냉동우동면", defaultStorageType: "냉동", defaultUnit: "pack" },
  { id: "frozen-shrimp", category: "냉동식품", name: "냉동새우", defaultStorageType: "냉동", defaultUnit: "bag" },
  { id: "frozen-squid", category: "냉동식품", name: "냉동오징어", defaultStorageType: "냉동", defaultUnit: "bag" },
  { id: "frozen-chicken", category: "냉동식품", name: "냉동닭가슴살", defaultStorageType: "냉동", defaultUnit: "pack" },
  { id: "frozen-pork-cutlet", category: "냉동식품", name: "냉동돈까스", defaultStorageType: "냉동", defaultUnit: "pack" },
  { id: "frozen-fishcake", category: "냉동식품", name: "냉동어묵", defaultStorageType: "냉동", defaultUnit: "pack" },
  { id: "frozen-vegetable-mix", category: "냉동식품", name: "냉동야채믹스", defaultStorageType: "냉동", defaultUnit: "bag" },
  { id: "frozen-blueberry", category: "냉동식품", name: "냉동블루베리", defaultStorageType: "냉동", defaultUnit: "bag" },
  { id: "frozen-fries", category: "냉동식품", name: "냉동감자튀김", defaultStorageType: "냉동", defaultUnit: "bag" },

  { id: "season-soy-soup", category: "조미료", name: "국간장", aliases: ["조선간장"], defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-soy-dark", category: "조미료", name: "진간장", aliases: ["간장", "양조간장"], defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-gochujang", category: "조미료", name: "고추장", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-doenjang", category: "조미료", name: "된장", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-ssamjang", category: "조미료", name: "쌈장", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-salt", category: "조미료", name: "소금", aliases: ["굵은소금", "꽃소금"], defaultStorageType: "실온", defaultUnit: "tsp" },
  { id: "season-sugar", category: "조미료", name: "설탕", aliases: ["백설탕", "갈색설탕"], defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-vinegar", category: "조미료", name: "식초", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-sesame-oil", category: "조미료", name: "참기름", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-perilla-oil", category: "조미료", name: "들기름", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-pepper", category: "조미료", name: "후추", aliases: ["후춧가루"], defaultStorageType: "실온", defaultUnit: "tsp" },
  { id: "season-pepper-powder", category: "조미료", name: "고춧가루", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-oyster-sauce", category: "조미료", name: "굴소스", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-curry", category: "조미료", name: "카레가루", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-ketchup", category: "조미료", name: "케첩", aliases: ["토마토케첩"], defaultStorageType: "실온", defaultUnit: "tbsp" },

  { id: "grain-rice", category: "곡물/면/빵", name: "쌀", defaultStorageType: "실온", defaultUnit: "kg" },
  { id: "grain-brown-rice", category: "곡물/면/빵", name: "현미", defaultStorageType: "실온", defaultUnit: "kg" },
  { id: "grain-flour", category: "곡물/면/빵", name: "밀가루", defaultStorageType: "실온", defaultUnit: "g" },
  { id: "grain-starch", category: "곡물/면/빵", name: "전분", aliases: ["감자전분", "옥수수전분"], defaultStorageType: "실온", defaultUnit: "g" },
  { id: "grain-noodle", category: "곡물/면/빵", name: "국수", defaultStorageType: "실온", defaultUnit: "g" },
  { id: "grain-ramen", category: "곡물/면/빵", name: "라면", defaultStorageType: "실온", defaultUnit: "pack" },
  { id: "grain-pasta", category: "곡물/면/빵", name: "파스타면", aliases: ["스파게티면"], defaultStorageType: "실온", defaultUnit: "g" },
  { id: "grain-udon", category: "곡물/면/빵", name: "우동면", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "grain-bread", category: "곡물/면/빵", name: "식빵", defaultStorageType: "실온", defaultUnit: "slice" },
  { id: "grain-baguette", category: "곡물/면/빵", name: "바게트", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "grain-breadcrumb", category: "곡물/면/빵", name: "빵가루", defaultStorageType: "실온", defaultUnit: "g" },
  { id: "grain-ricecake", category: "곡물/면/빵", name: "떡", aliases: ["떡국떡", "떡볶이떡"], defaultStorageType: "냉장", defaultUnit: "pack" },

  { id: "proc-tuna-can", category: "통조림/가공식품", name: "참치캔", aliases: ["참치 통조림"], defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-corn-can", category: "통조림/가공식품", name: "옥수수캔", defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-beans-can", category: "통조림/가공식품", name: "콩통조림", aliases: ["병아리콩", "강낭콩"], defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-spam", category: "통조림/가공식품", name: "스팸", aliases: ["햄통조림"], defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-kimchi", category: "통조림/가공식품", name: "김치", aliases: ["배추김치"], defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "proc-pickle", category: "통조림/가공식품", name: "피클", defaultStorageType: "냉장", defaultUnit: "bottle" },
  { id: "proc-olive", category: "통조림/가공식품", name: "올리브", defaultStorageType: "냉장", defaultUnit: "bottle" },
  { id: "proc-jam", category: "통조림/가공식품", name: "잼", aliases: ["딸기잼", "블루베리잼"], defaultStorageType: "냉장", defaultUnit: "bottle" },
  { id: "proc-sauce-pasta", category: "통조림/가공식품", name: "토마토소스", aliases: ["파스타소스"], defaultStorageType: "실온", defaultUnit: "bottle" },
  { id: "proc-stock", category: "통조림/가공식품", name: "육수팩", aliases: ["멸치육수팩"], defaultStorageType: "실온", defaultUnit: "pack" },

  { id: "misc-water", category: "음료/기타", name: "생수", defaultStorageType: "실온", defaultUnit: "bottle" },
  { id: "misc-sparkling-water", category: "음료/기타", name: "탄산수", defaultStorageType: "실온", defaultUnit: "bottle" },
  { id: "misc-orange-juice", category: "음료/기타", name: "오렌지주스", defaultStorageType: "냉장", defaultUnit: "ml" },
  { id: "misc-apple-juice", category: "음료/기타", name: "사과주스", defaultStorageType: "냉장", defaultUnit: "ml" },
  { id: "misc-coffee", category: "음료/기타", name: "커피", aliases: ["원두커피"], defaultStorageType: "실온", defaultUnit: "g" },
  { id: "misc-tea", category: "음료/기타", name: "티백", aliases: ["홍차", "녹차"], defaultStorageType: "실온", defaultUnit: "pack" },
  { id: "misc-nuts", category: "음료/기타", name: "견과류", aliases: ["아몬드", "호두"], defaultStorageType: "실온", defaultUnit: "bag" },
  { id: "misc-honey", category: "음료/기타", name: "꿀", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "misc-syrup", category: "음료/기타", name: "올리고당", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "misc-cocoa", category: "음료/기타", name: "코코아가루", defaultStorageType: "실온", defaultUnit: "tbsp" },

  { id: "veg-chili-pepper", category: "채소", name: "고추", aliases: ["청양고추", "홍고추", "풋고추"], defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-eggplant", category: "채소", name: "가지", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-garlic-chive", category: "채소", name: "부추", aliases: ["영양부추"], defaultStorageType: "냉장", defaultUnit: "bag" },
  { id: "veg-minari", category: "채소", name: "미나리", defaultStorageType: "냉장", defaultUnit: "bag" },
  { id: "veg-bok-choy", category: "채소", name: "청경채", defaultStorageType: "냉장", defaultUnit: "bag" },
  { id: "veg-young-napa", category: "채소", name: "알배추", aliases: ["알배기배추"], defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "veg-pumpkin-sweet", category: "채소", name: "단호박", defaultStorageType: "실온", defaultUnit: "piece" },
  { id: "veg-lotus-root", category: "채소", name: "연근", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "veg-burdock", category: "채소", name: "우엉", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "veg-bracken", category: "채소", name: "고사리", aliases: ["삶은고사리"], defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "veg-balloon-flower-root", category: "채소", name: "도라지", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "veg-chives", category: "채소", name: "실파", aliases: ["잔파"], defaultStorageType: "냉장", defaultUnit: "bag" },

  { id: "meat-ground-pork", category: "육류", name: "다진 돼지고기", aliases: ["돼지고기 다짐육"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-ground-beef", category: "육류", name: "다진 소고기", aliases: ["소고기 다짐육"], defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-chicken-tenderloin", category: "육류", name: "닭안심", defaultStorageType: "냉장", defaultUnit: "g" },
  { id: "meat-pork-rib", category: "육류", name: "돼지갈비", defaultStorageType: "냉장", defaultUnit: "g" },

  { id: "sea-hairtail", category: "수산물", name: "갈치", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "sea-cod", category: "수산물", name: "대구", defaultStorageType: "냉장", defaultUnit: "piece" },
  { id: "sea-pollack", category: "수산물", name: "동태", aliases: ["명태"], defaultStorageType: "냉동", defaultUnit: "piece" },
  { id: "sea-dried-pollack", category: "수산물", name: "황태채", aliases: ["북어채"], defaultStorageType: "실온", defaultUnit: "g" },

  { id: "frozen-tteokbokki", category: "냉동식품", name: "냉동떡볶이", defaultStorageType: "냉동", defaultUnit: "pack" },
  { id: "frozen-hotdog", category: "냉동식품", name: "냉동핫도그", defaultStorageType: "냉동", defaultUnit: "pack" },
  { id: "frozen-corn", category: "냉동식품", name: "냉동옥수수", defaultStorageType: "냉동", defaultUnit: "bag" },
  { id: "frozen-spinach", category: "냉동식품", name: "냉동시금치", defaultStorageType: "냉동", defaultUnit: "bag" },

  { id: "season-cooking-wine", category: "조미료", name: "맛술", aliases: ["미림", "요리술"], defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-fish-sauce-anchovy", category: "조미료", name: "멸치액젓", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-fish-sauce-sandlance", category: "조미료", name: "까나리액젓", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-chicken-stock", category: "조미료", name: "치킨스톡", aliases: ["닭육수"], defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-sesame-seed", category: "조미료", name: "깨", aliases: ["참깨", "통깨"], defaultStorageType: "실온", defaultUnit: "tsp" },
  { id: "season-perilla-powder", category: "조미료", name: "들깨가루", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-chili-oil", category: "조미료", name: "고추기름", defaultStorageType: "실온", defaultUnit: "tbsp" },
  { id: "season-mustard", category: "조미료", name: "겨자", aliases: ["연겨자"], defaultStorageType: "냉장", defaultUnit: "tsp" },
  { id: "season-plum-syrup", category: "조미료", name: "매실청", defaultStorageType: "실온", defaultUnit: "tbsp" },

  { id: "grain-glass-noodle", category: "곡물/면/빵", name: "당면", defaultStorageType: "실온", defaultUnit: "g" },
  { id: "grain-somen", category: "곡물/면/빵", name: "소면", aliases: ["잔치국수면"], defaultStorageType: "실온", defaultUnit: "g" },
  { id: "grain-ramyeon-noodle", category: "곡물/면/빵", name: "라면사리", defaultStorageType: "실온", defaultUnit: "pack" },
  { id: "grain-tortilla", category: "곡물/면/빵", name: "또띠아", defaultStorageType: "냉장", defaultUnit: "pack" },
  { id: "grain-rice-paper", category: "곡물/면/빵", name: "라이스페이퍼", defaultStorageType: "실온", defaultUnit: "pack" },
  { id: "grain-oatmeal", category: "곡물/면/빵", name: "오트밀", defaultStorageType: "실온", defaultUnit: "g" },

  { id: "proc-tomato-can", category: "통조림/가공식품", name: "토마토캔", aliases: ["홀토마토"], defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-whelk-can", category: "통조림/가공식품", name: "골뱅이캔", aliases: ["골뱅이 통조림"], defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-pacific-saury-can", category: "통조림/가공식품", name: "꽁치캔", aliases: ["꽁치 통조림"], defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-mackerel-can", category: "통조림/가공식품", name: "고등어캔", aliases: ["고등어 통조림"], defaultStorageType: "실온", defaultUnit: "can" },
  { id: "proc-chicken-breast-can", category: "통조림/가공식품", name: "닭가슴살캔", defaultStorageType: "실온", defaultUnit: "can" },
];

const normalized = (value: string) => value.trim().toLowerCase();

export function getIngredientCatalog(): IngredientCatalogItem[] {
  return CATALOG;
}

export function getIngredientCatalogItem(id: string): IngredientCatalogItem | null {
  return CATALOG.find((item) => item.id === id) ?? null;
}

export function getIngredientCatalogByCategory(
  category: IngredientCategory,
): IngredientCatalogItem[] {
  return CATALOG.filter((item) => item.category === category);
}

export function searchIngredientCatalog({
  category,
  query,
  limit = 24,
}: {
  category?: IngredientCategory;
  query?: string;
  limit?: number;
}): IngredientCatalogItem[] {
  const safeLimit = Math.max(1, Math.floor(limit));
  const keyword = query ? normalized(query) : "";

  return CATALOG.filter((item) => {
    if (category && item.category !== category) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    if (normalized(item.name).includes(keyword)) {
      return true;
    }

    return (item.aliases ?? []).some((alias) => normalized(alias).includes(keyword));
  }).slice(0, safeLimit);
}
