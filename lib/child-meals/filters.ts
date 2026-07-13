import type {
  ChildAllergenCode,
  ChildMealType,
  ChildTexturePreference,
} from './types.ts'
import {
  hasExcludedChildAllergen,
  isChildGuidanceAgeEligible,
} from './validation.ts'

export interface ChildMealFilterableRecipe {
  minAgeMonths: number
  maxAgeMonths: number
  allergenCodes: ChildAllergenCode[]
  activeTimeMinutes: number
  familySplitSupported: boolean
  freezerFriendlyCandidate?: boolean
  freezerFriendly?: boolean
  textureLevel: string
  mealTypes: ChildMealType[]
}

export interface ChildMealFilterInput {
  ageMonths: number
  excludedAllergenCodes: ChildAllergenCode[]
  maxActiveTimeMinutes: 10 | 15 | 20 | null
  familySplitOnly: boolean
  freezerFriendlyOnly: boolean
  texturePreference: ChildTexturePreference | null
  mealTypes: ChildMealType[]
}

export function matchesChildMealFilters(
  recipe: ChildMealFilterableRecipe,
  input: ChildMealFilterInput,
): boolean {
  if (!isChildGuidanceAgeEligible(recipe, input.ageMonths)) return false
  if (hasExcludedChildAllergen(recipe, input.excludedAllergenCodes)) return false
  if (
    input.maxActiveTimeMinutes !== null &&
    recipe.activeTimeMinutes > input.maxActiveTimeMinutes
  ) {
    return false
  }
  if (input.familySplitOnly && !recipe.familySplitSupported) return false
  const freezerFriendly = recipe.freezerFriendly ?? recipe.freezerFriendlyCandidate ?? false
  if (input.freezerFriendlyOnly && !freezerFriendly) return false
  if (input.texturePreference && recipe.textureLevel !== input.texturePreference) return false
  if (
    input.mealTypes.length > 0 &&
    !recipe.mealTypes.some((mealType) => input.mealTypes.includes(mealType))
  ) {
    return false
  }
  return true
}

export function filterChildMealRecipes<TRecipe extends ChildMealFilterableRecipe>(
  recipes: TRecipe[],
  input: ChildMealFilterInput,
): TRecipe[] {
  return recipes.filter((recipe) => matchesChildMealFilters(recipe, input))
}

export function sortChildMealRecipes<TRecipe extends ChildMealFilterableRecipe>(
  recipes: TRecipe[],
  input: Pick<ChildMealFilterInput, 'familySplitOnly' | 'freezerFriendlyOnly'>,
): TRecipe[] {
  return recipes.slice().sort((left, right) => {
    const leftFreezerFriendly = left.freezerFriendly ?? left.freezerFriendlyCandidate ?? false
    const rightFreezerFriendly = right.freezerFriendly ?? right.freezerFriendlyCandidate ?? false
    if (!input.familySplitOnly && left.familySplitSupported !== right.familySplitSupported) {
      return Number(right.familySplitSupported) - Number(left.familySplitSupported)
    }
    if (!input.freezerFriendlyOnly && leftFreezerFriendly !== rightFreezerFriendly) {
      return Number(rightFreezerFriendly) - Number(leftFreezerFriendly)
    }
    return left.activeTimeMinutes - right.activeTimeMinutes
  })
}
