# Jipbab Note Release Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove release blockers, add hybrid ingredient entry with a richer catalog and beginner-friendly unit system, and verify the app in simulator as a realistic App Store candidate.

**Architecture:** Keep the current Next.js + Supabase + Capacitor structure, but harden auth/data ownership first, then layer a static ingredient catalog plus structured measurement fields into the fridge flow. Reuse current hooks and pages where possible, and keep existing fallback behavior working while new structure is introduced.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Capacitor iOS shell.

---

### Task 1: Lock current verification baseline

**Files:**
- Verify only

**Step 1: Run lint**

Run: `pnpm lint`
Expected: exit code 0

**Step 2: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 3: Run production build**

Run: `pnpm build`
Expected: exit code 0

**Step 4: Run iOS simulator compile**

Run: `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO`
Expected: exit code 0, warnings allowed but recorded

### Task 2: Add failing tests for release hardening helpers

**Files:**
- Create: `tests/ingredient-catalog.test.ts`
- Create: `tests/measurement-format.test.ts`
- Create: `tests/coupang-link-resolution.test.ts`

**Step 1: Write failing tests for ingredient catalog search and grouping**

Cover:
- category filter
- keyword alias search
- direct-input fallback marker

**Step 2: Write failing tests for unit display formatting**

Cover:
- metric preset
- spoon preset
- count preset

**Step 3: Write failing tests for partner-link resolution**

Cover:
- item-specific link
- category link
- search fallback

**Step 4: Run targeted tests to verify failure**

Run the chosen test command for those files.
Expected: fail for missing implementation

### Task 3: Introduce ingredient catalog and measurement domain types

**Files:**
- Modify: `types/index.ts`
- Create: `lib/ingredient-catalog.ts`
- Create: `lib/measurements.ts`

**Step 1: Add explicit ingredient category expansion**

Add expanded category union and exported ordered lists.

**Step 2: Add measurement types**

Add:
- `IngredientUnitSystem`
- `IngredientUnit`
- structured quantity fields for ingredients/shopping

**Step 3: Create static ingredient catalog**

Add a large curated dataset grouped by category with aliases and defaults.

**Step 4: Implement pure helpers**

Implement:
- catalog lookup
- search
- quantity display formatter
- unit preset mapping

**Step 5: Re-run targeted tests**

Expected: green for pure helper tests

### Task 4: Expand backend/API shape for catalog and quantity support

**Files:**
- Modify: `app/api/ingredients/route.ts`
- Modify: `app/api/recipes/route.ts`
- Modify: `app/recipe/[id]/page.tsx`
- Modify: `components/recipe/RecipeShoppingAssistant.tsx`

**Step 1: Switch ingredient suggestion route to prefer static catalog**

Keep MFDS-derived fallback if still useful, but ensure deterministic results.

**Step 2: Return richer suggestion payload**

Include category, aliases/defaults, and direct-input support metadata.

**Step 3: Preserve recipe behavior while preparing for structured amounts**

Do not break existing recipe browsing; normalize ingredients into richer internal representation where possible.

**Step 4: Keep shopping handoff compatible**

Ensure shopping assistant can pass name plus optional measurement defaults.

### Task 5: Harden Supabase ownership model

**Files:**
- Modify: `supabase/schema.sql`
- Create: `supabase/migrations/20260421*_harden_device_authz.sql`
- Modify: `supabase/migrations/20260228001000_verify_rls.sql`
- Modify: `lib/migrate-device-data.ts`

**Step 1: Write failing verification for guest-vs-user policy rules**

Require guest access only for rows with `user_id is null`.

**Step 2: Update RLS expressions**

Change policies so account-owned rows are not re-opened by device ID.

**Step 3: Update migration behavior**

When device data is migrated to a user, remove guest-only accessibility path.

**Step 4: Extend verification migration coverage**

Include `shopping_items` in RLS verification.

### Task 6: Add account deletion starting point

**Files:**
- Modify: `app/mypage/page.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/support/page.tsx`
- Optionally create: `app/account-delete/page.tsx`

**Step 1: Add visible in-app account deletion entry**

Place it where logged-in users can find it.

**Step 2: Explain data impact**

Show what is deleted and what support path exists.

**Step 3: Choose safest current implementation**

If true backend deletion is not ready, provide a compliant in-app initiation flow.

### Task 7: Update fridge UX to hybrid ingredient entry

**Files:**
- Modify: `app/fridge/page.tsx`
- Modify: `components/fridge/AddIngredientForm.tsx`
- Modify: `components/fridge/IngredientCard.tsx`
- Modify: `hooks/useIngredients.ts`
- Modify: `lib/utils.ts`

**Step 1: Replace simple category chips with expanded category model**

**Step 2: Add searchable detailed ingredient picker**

Use static catalog first, direct-input fallback second.

**Step 3: Split quantity into value + unit**

Keep user-friendly display string visible.

**Step 4: Add quick unit chips**

Support beginner-friendly common units.

**Step 5: Preserve current CRUD behavior**

Editing existing items must still work.

### Task 8: Add user-selectable unit system

**Files:**
- Modify: `hooks/useAppSettings.ts`
- Modify: `app/settings/page.tsx`
- Modify: `app/fridge/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/shopping/page.tsx`

**Step 1: Extend app settings type**

Add `unitSystem`.

**Step 2: Add settings UI**

Present 3 presets with plain-language descriptions.

**Step 3: Apply display formatting**

Use chosen system in ingredient and shopping displays.

### Task 9: Improve Coupang partner-link strategy

**Files:**
- Modify: `lib/external-links.ts`
- Modify: `.env.example`
- Modify: `docs/setup-production.md`
- Modify: `docs/app-store-connect-metadata-ko.md`

**Step 1: Add category-level env variables and resolution logic**

**Step 2: Mark affiliate destinations clearly in UI text**

**Step 3: Document the operating model**

Specify item-specific, category-level, and fallback order.

### Task 10: Add mobile permission metadata

**Files:**
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Step 1: Add iOS camera usage description**

**Step 2: Add Android camera permission**

**Step 3: Confirm barcode page behavior still degrades gracefully**

### Task 11: Re-run verification

**Files:**
- Verify changed files only

**Step 1: Run lint**

Run: `pnpm lint`

**Step 2: Run typecheck**

Run: `pnpm exec tsc --noEmit`

**Step 3: Run tests**

Run the chosen test command

**Step 4: Run production build**

Run: `pnpm build`

**Step 5: Run iOS simulator compile**

Run the same `xcodebuild` simulator compile command

### Task 12: Simulator walkthrough and review

**Files:**
- Verify only

**Step 1: Launch the app in simulator**

**Step 2: Walk through a realistic first-time user flow**

Cover:
- fridge add/edit
- category + detail ingredient selection
- quantity/unit choice
- settings unit-system change
- support/privacy/account deletion entry

**Step 3: Record competitive gaps**

Compare input speed, clarity, onboarding, reliability, and monetization clarity.

**Step 4: Record residual security risks**

Document anything still unsuitable for App Store release.
