# Jipbab Note V2 Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade `jipbab-note` into a stronger beta foundation with a real-data home dashboard, first-class shopping flow, improved fridge UX, and working developer setup docs.

**Architecture:** Keep `jipbab-note` as the single destination repo. Reuse existing hooks, types, and Supabase/local fallback patterns where possible, but replace placeholder UI and add missing shopping-domain wiring. Import ideas from sibling repos as implementation references, not as direct product duplication.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind, Supabase, Capacitor-ready web app.

---

## Task 1: Baseline Verification

**Files:**
- Verify only

**Steps:**
1. Run `pnpm install` if needed.
2. Run `pnpm lint`.
3. Run `pnpm exec tsc --noEmit`.
4. Run `pnpm build`.
5. Record failures before product changes.

## Task 2: Real-Data Home Dashboard

**Files:**
- Modify: `app/page.tsx`
- Reuse: `hooks/useIngredients.ts`
- Reuse: `hooks/useRecipes.ts`
- Reuse: `lib/utils.ts`

**Steps:**
1. Replace hardcoded stats and placeholder recipe cards with real computed data.
2. Add expiring/expired section driven by current ingredient records.
3. Add shopping summary block driven by shopping state.
4. Keep current visual tone but make content trustworthy.
5. Verify dashboard changes when ingredient state changes.

## Task 3: Primary Navigation Update

**Files:**
- Modify: `components/layout/BottomTab.tsx`

**Steps:**
1. Replace `community` primary tab with `shopping` for v1 beta focus.
2. Keep route labels/icons mobile-friendly.
3. Ensure active state works for the new route.

## Task 4: Shopping Domain Foundation

**Files:**
- Create: `app/shopping/page.tsx`
- Create or modify: supporting shopping hook/util/types under `hooks/`, `lib/`, `types/`

**Steps:**
1. Add dedicated shopping page with empty and populated states.
2. Support manual item add, toggle complete, remove, clear completed.
3. Use the lightest persistence path compatible with current app constraints.
4. Keep implementation isolated and testable.

## Task 5: Recipe-To-Shopping Handoff

**Files:**
- Modify: `app/recipe/[id]/page.tsx`
- Reuse: recipe matching helpers
- Reuse or extend: shopping domain files

**Steps:**
1. Surface missing ingredients clearly in recipe detail.
2. Add action to send missing ingredients into shopping.
3. Prevent obvious duplicate spam where practical.

## Task 6: Fridge Entry UX Improvement

**Files:**
- Modify: `app/fridge/page.tsx`
- Reuse: `components/fridge/*`
- Reuse: `types/index.ts`

**Steps:**
1. Improve add flow toward category-led and faster defaults.
2. Add expiry presets if feasible within current UI structure.
3. Preserve CRUD and current persistence behavior.

## Task 7: Docs and Env Contract

**Files:**
- Modify: `README.md`
- Create: `.env.example`

**Steps:**
1. Replace template README with product-specific setup and verification docs.
2. Add required env variable placeholders.
3. Include run/build/test commands and beta scope notes.

## Task 8: Final Verification

**Files:**
- Verify changed files

**Steps:**
1. Re-run `pnpm lint`.
2. Re-run `pnpm exec tsc --noEmit`.
3. Re-run `pnpm build`.
4. Review diff for consistency with v1 beta scope.
