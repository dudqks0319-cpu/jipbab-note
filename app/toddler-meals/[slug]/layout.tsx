import type { ReactNode } from 'react'

import ChildMealFeedback from '@/components/child-meals/ChildMealFeedback'

type ToddlerMealDetailLayoutProps = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function ToddlerMealDetailLayout({
  children,
  params,
}: ToddlerMealDetailLayoutProps) {
  const { slug } = await params

  return (
    <>
      {children}
      <div className="bg-white px-5 pb-24">
        <ChildMealFeedback recipeId={slug} />
      </div>
    </>
  )
}
