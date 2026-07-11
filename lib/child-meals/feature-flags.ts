const explicitChildMealsEnabled = process.env.NEXT_PUBLIC_ENABLE_CHILD_MEALS === 'true'
const explicitToddlerMealsEnabled = process.env.NEXT_PUBLIC_ENABLE_TODDLER_MEALS === 'true'
const isToddlerFeaturePreview =
  process.env.VERCEL_ENV === 'preview' &&
  (process.env.VERCEL_GIT_COMMIT_REF?.startsWith('feat/toddler-meals') ?? false)

export const CHILD_MEALS_ENABLED = explicitChildMealsEnabled || isToddlerFeaturePreview
export const TODDLER_MEALS_ENABLED =
  (explicitChildMealsEnabled && explicitToddlerMealsEnabled) || isToddlerFeaturePreview
