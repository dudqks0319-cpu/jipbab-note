import recipePartOne from '@/content/child-meals/toddler-24-36/recipes-01-03.json'
import recipePartTwo from '@/content/child-meals/toddler-24-36/recipes-04-06.json'
import recipePartThree from '@/content/child-meals/toddler-24-36/recipes-07-09.json'
import recipePartFour from '@/content/child-meals/toddler-24-36/recipes-10-12.json'

import type {
  ChildAllergenCode,
  ChildMealType,
  ChildStoragePolicyCode,
  ChildTextureLevel,
} from './types'

export type ToddlerDraftIngredient = {
  name: string
  display: string
  prepNote: string
  optional: boolean
  allergenCodes: ChildAllergenCode[]
}

export type ToddlerDraftStep = {
  order: number
  title: string
  action: string
  heat: string
  minutes: number
  visualCue: string
  safetyNote: string
  commonMistake: string
  rescueTip: string
  familySplitPoint: boolean
}

export type ToddlerDraftRecipe = {
  slug: string
  title: string
  summary: string
  minAgeMonths: number
  maxAgeMonths: number
  mealTypes: ChildMealType[]
  textureLevel: ChildTextureLevel
  servingLabel: string
  prepTimeMinutes: number
  cookTimeMinutes: number
  totalTimeMinutes: number
  activeTimeMinutes: number
  difficulty: number
  tools: string[]
  ingredients: ToddlerDraftIngredient[]
  steps: ToddlerDraftStep[]
  allergenCodes: ChildAllergenCode[]
  nutritionRoles: string[]
  sodiumStrategy: string
  servingShapeNotes: Array<{
    ingredientName: string
    instruction: string
    required: boolean
  }>
  familySplitSupported: boolean
  familySplitInstruction: string
  freezerFriendlyCandidate: boolean
  freezerQualityDays: number | null
  storagePolicyCode: ChildStoragePolicyCode
  storageGuide: string
  reheatingGuide: string
  pickyEatingTip: string
  caregiverNote: string
  safetyNotes: string[]
  publication: {
    publishStatus: string
    reviewStatus: string
    actualCookingTested: boolean
    foodSafetyReviewed: boolean
    childFeedingReviewed: boolean
    imageRightsStatus: string
    requirementsVerified: boolean
    publishedAt: string | null
  }
}

const parts = [recipePartOne, recipePartTwo, recipePartThree, recipePartFour]

export const TODDLER_DRAFT_RECIPES = parts
  .flatMap((part) => part.recipes)
  .map((recipe) => recipe as unknown as ToddlerDraftRecipe)

export function getToddlerDraftRecipe(slug: string): ToddlerDraftRecipe | null {
  return TODDLER_DRAFT_RECIPES.find((recipe) => recipe.slug === slug) ?? null
}
