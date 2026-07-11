import type {
  ChildAgeBand,
  ChildAllergenCode,
  ChildMealType,
  ChildTexturePreference,
} from './types'

export const CHILD_AGE_BAND_LABELS: Record<ChildAgeBand, string> = {
  '24_29': '24~29개월',
  '30_36': '30~36개월',
}

export const CHILD_TEXTURE_LABELS: Record<ChildTexturePreference, string> = {
  soft_bite: '부드럽게 씹기',
  family_cut: '가족식 크기',
}

export const CHILD_MEAL_TYPE_LABELS: Record<ChildMealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

export const CHILD_ALLERGEN_LABELS: Record<ChildAllergenCode, string> = {
  egg: '달걀',
  milk: '우유',
  wheat: '밀',
  soy: '대두',
  peanut: '땅콩',
  tree_nut: '견과류',
  sesame: '참깨',
  buckwheat: '메밀',
  fish: '생선',
  shellfish: '갑각류·조개',
  pork: '돼지고기',
  chicken: '닭고기',
  beef: '소고기',
  peach: '복숭아',
  tomato: '토마토',
  sulfite: '아황산류',
  pine_nut: '잣',
}

export const CAREGIVER_SAFETY_COPY =
  '월령은 참고 범위예요. 아이의 씹기·삼키기 발달과 의료진 안내를 함께 확인하고, 식사 중에는 바르게 앉혀 가까이에서 지켜봐 주세요.'
