// 이 파일은 검색에 공개할 초보 조리 가이드의 검수 가능한 정적 원문을 관리합니다.
export type CookingGuide = {
  slug: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

const COOKING_GUIDES: CookingGuide[] = [
  {
    slug: "beginner-measurements",
    title: "초보자를 위한 계량 기본",
    summary: "큰술·작은술·컵 표기를 헷갈리지 않고 레시피 계량을 시작하는 방법입니다.",
    sections: [
      {
        heading: "같은 도구로 끝까지 계량하세요",
        paragraphs: [
          "레시피 한 개를 만드는 동안에는 같은 계량스푼과 계량컵을 사용하세요. 밥숟가락은 제품마다 크기가 달라 결과가 달라질 수 있습니다.",
          "액체는 평평한 곳에서 눈높이를 맞춰 읽고, 가루는 수북이 담지 말고 윗면을 평평하게 정리합니다.",
        ],
      },
      {
        heading: "처음에는 원문 계량을 지키세요",
        paragraphs: [
          "소금과 간장은 한 번에 늘리기보다 원문 양으로 시작한 뒤 마지막에 맛을 보고 조금씩 보완하세요.",
          "집밥노트의 인분 환산값은 숫자 계량만 바꿉니다. 팬 크기와 가열 시간은 상태를 보며 조정해야 합니다.",
        ],
      },
    ],
  },
  {
    slug: "safe-heat-control",
    title: "불 조절과 익힘 확인 기본",
    summary: "센불·중불·약불의 역할과 음식 상태를 함께 확인하는 초보 조리 원칙입니다.",
    sections: [
      {
        heading: "시간보다 상태를 함께 보세요",
        paragraphs: [
          "조리도구와 화력에 따라 같은 시간에도 결과가 달라집니다. 레시피의 시간과 함께 색, 기포, 수분량 같은 시각 신호를 확인하세요.",
          "팬에서 연기가 과하게 나거나 재료가 빠르게 검게 변하면 즉시 불을 낮추고 팬을 잠시 화구에서 뗍니다.",
        ],
      },
      {
        heading: "육류와 해산물은 안전하게 익히세요",
        paragraphs: [
          "겉면 색만으로 익힘을 단정하지 마세요. 두꺼운 고기는 중심부까지 충분히 가열하고, 교차 오염을 막기 위해 생재료용 도구를 바로 세척합니다.",
        ],
      },
    ],
  },
  {
    slug: "fridge-first-meal-planning",
    title: "냉장고 재료부터 쓰는 일주일 식단",
    summary: "소비기한과 보유 재료를 기준으로 낭비를 줄이는 주간 식단 작성 순서입니다.",
    sections: [
      {
        heading: "먼저 써야 할 재료를 고르세요",
        paragraphs: [
          "소비기한이 가까운 채소, 개봉한 식품, 해동한 재료를 먼저 표시합니다. 이 재료가 들어가는 메뉴를 주 초반에 배치하세요.",
          "모든 끼니를 새 요리로 채우지 않아도 됩니다. 남은 음식, 외식, 간단식을 식단에 명시하면 실제 실행 가능성이 높아집니다.",
        ],
      },
      {
        heading: "장보기는 부족한 양만 보완하세요",
        paragraphs: [
          "메뉴를 정한 뒤 냉장고에 없는 필수 재료만 장보기 목록으로 옮깁니다. 같은 단위로 표현할 수 있는 항목끼리 합산하고, 단위가 다르면 억지로 합치지 않습니다.",
        ],
      },
    ],
  },
];

export function getCookingGuides(): CookingGuide[] {
  return COOKING_GUIDES;
}

export function getCookingGuide(slug: string): CookingGuide | null {
  return COOKING_GUIDES.find((guide) => guide.slug === slug) ?? null;
}
