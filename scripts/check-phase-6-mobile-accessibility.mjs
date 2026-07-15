import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const roots = ["app", "components"];
const failures = [];
let interactiveTagCount = 0;

function collectTsxFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    return statSync(filePath).isDirectory()
      ? collectTsxFiles(filePath)
      : filePath.endsWith(".tsx")
        ? [filePath]
        : [];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

for (const filePath of roots.flatMap(collectTsxFiles)) {
  const source = readFileSync(filePath, "utf8");
  const scanSource = source.replaceAll("=>", "⇒");
  const interactiveTags = scanSource.matchAll(/<(button|a|Link)\b[\s\S]*?>/g);

  for (const match of interactiveTags) {
    interactiveTagCount += 1;
    const openingTag = match[0];
    if (/\b(?:h|min-h)-(?:8|9|10)\b/.test(openingTag)) {
      failures.push(
        `${filePath}:${lineNumber(scanSource, match.index)} has an explicit touch target below 44px`,
      );
    }
    if (/\brounded-full\s+p-2\b|\bclassName="p-2\b/.test(openingTag)) {
      failures.push(
        `${filePath}:${lineNumber(scanSource, match.index)} uses icon padding without a 44px target`,
      );
    }
  }
}

const layout = readFileSync("app/layout.tsx", "utf8");
const shell = readFileSync("components/layout/AppShell.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");
const button = readFileSync("components/ui/Button.tsx", "utf8");
const fridgeIllustration = readFileSync("components/fridge/FridgeIllustration.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const starterAction = readFileSync("components/home/StarterActionCard.tsx", "utf8");
const fridge = readFileSync("app/fridge/page.tsx", "utf8");
const recipeList = readFileSync("app/recipe/page.tsx", "utf8");
const recipeDetail = readFileSync("app/recipe/[id]/page.tsx", "utf8");
const recipeImport = readFileSync("app/recipe/import/page.tsx", "utf8");
const shopping = readFileSync("app/shopping/page.tsx", "utf8");
const recipeComments = readFileSync("components/recipe/RecipeComments.tsx", "utf8");
const recipeFavorite = readFileSync("components/recipe/RecipeFavoriteButton.tsx", "utf8");
const cookMode = readFileSync("components/recipe/RecipeCookMode.tsx", "utf8");
const coreComponentSource = ["components/home", "components/layout", "components/recipe"]
  .flatMap(collectTsxFiles)
  .map((filePath) => readFileSync(filePath, "utf8"))
  .join("\n");
const coreSurfaceSource = [
  home,
  starterAction,
  shell,
  fridge,
  recipeList,
  recipeDetail,
  recipeImport,
  shopping,
  recipeComments,
  recipeFavorite,
  cookMode,
  coreComponentSource,
].join("\n");

function relativeLuminance(hexColor) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const auditedContrastPairs = [
  ["primary text", "#2f2117", "#fbf6ee", 4.5],
  ["muted text", "#6b5f55", "#fbf6ee", 4.5],
  ["secondary text", "#5f5145", "#f1e4d7", 4.5],
  ["green secondary text", "#566347", "#f8fbf2", 4.5],
  ["accent text", "#a63b13", "#fff0e4", 4.5],
  ["primary button", "#ffffff", "#c2410c", 4.5],
  ["focus indicator", "#0f766e", "#fffaf3", 3],
];
const forbiddenLowContrastTokens = [
  "text-[#8f7f70]",
  "text-[#a69585]",
  "text-[#b5a493]",
  "text-[#9f8d7a]",
  "text-[#9f9388]",
  "text-[#d94d19]",
  "text-[#ea5a1f]",
  "text-[#a66a17]",
  "text-[#2f6fec]",
  "text-[#9b8979]",
  "text-[#7d6d5f]",
  "text-[#6c7a5b]",
  "bg-[#ea5a1f]",
];

const contracts = [
  [
    "viewport zoom",
    !layout.includes("userScalable: false") && !layout.includes("maximumScale: 1"),
    "viewport must allow user zoom",
  ],
  [
    "skip link",
    shell.includes('href="#main-content"') && shell.includes("본문으로 건너뛰기"),
    "keyboard users need a visible-on-focus skip link",
  ],
  [
    "main landmark",
    shell.includes('id="main-content"') && shell.includes("tabIndex={-1}"),
    "the skip target must be a focusable main landmark",
  ],
  [
    "button target floor",
    /button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/.test(styles),
    "all native buttons need a 44px minimum target",
  ],
  [
    "form target floor",
    /input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\):not\(\[type='file'\]\):not\(\[type='hidden'\]\),[\s\S]*?min-height:\s*44px;/.test(
      styles,
    ),
    "mobile text controls need a 44px minimum target",
  ],
  [
    "reduced motion",
    styles.includes("@media (prefers-reduced-motion: reduce)") &&
      styles.includes("animation-duration: 0.01ms !important"),
    "motion-sensitive users need animation and transition suppression",
  ],
  [
    "keyboard focus indicator",
    styles.includes("a:focus-visible") &&
      styles.includes("button:focus-visible") &&
      styles.includes("input:focus-visible") &&
      styles.includes("outline: 3px solid #0f766e") &&
      styles.includes("outline-offset: 3px"),
    "links, buttons, fields, and custom focus targets need a visible high-contrast focus ring",
  ],
  [
    "shared small button",
    button.includes('sm: "h-11 px-3 text-sm"'),
    "the reusable small button must still be 44px high",
  ],
  [
    "above-fold image priority",
    fridgeIllustration.includes('loading="eager"') &&
      fridgeIllustration.includes('fetchPriority="high"') &&
      home.includes('src={HOME_FRIDGE_IMAGE}') &&
      home.includes('loading="eager"') &&
      starterAction.includes('src={FRIDGE_IMAGE_SRC}') &&
      starterAction.includes('loading="eager"'),
    "every above-fold fridge LCP image needs eager high-priority loading",
  ],
  [
    "core form accessible names",
    fridge.includes('aria-label="냉장고 재료 검색"') &&
      fridge.includes('aria-label="여러 재료 한 번에 입력"') &&
      recipeList.includes('aria-label="레시피 검색"') &&
      shopping.includes('aria-label="장보기 빠른 재료 입력"') &&
      shopping.includes('aria-label="장보기 재료명"') &&
      shopping.includes('aria-label="장보기 재료 수량"') &&
      shopping.includes('aria-label="추가할 재료 카테고리"') &&
      shopping.includes('aria-label="구매처"') &&
      shopping.includes('aria-label="개당 가격"') &&
      recipeImport.includes('aria-label="레시피 이름"') &&
      recipeImport.includes('aria-label="레시피 URL"') &&
      recipeComments.includes('aria-label="레시피 댓글"'),
    "core search, entry, import, purchase, and comment controls need explicit accessible names",
  ],
  [
    "visible form label association",
    fridge.includes('htmlFor="fridge-ingredient-name"') &&
      fridge.includes('id="fridge-ingredient-name"') &&
      fridge.includes('htmlFor="fridge-ingredient-amount"') &&
      fridge.includes('id="fridge-ingredient-amount"') &&
      fridge.includes('htmlFor="fridge-ingredient-expiry"') &&
      fridge.includes('id="fridge-ingredient-expiry"') &&
      fridge.includes('htmlFor="fridge-ingredient-memo"') &&
      fridge.includes('id="fridge-ingredient-memo"'),
    "visible fridge form labels must be programmatically associated with their fields",
  ],
  [
    "error message association",
    recipeImport.includes("recipe-import-title-error") &&
      recipeImport.includes("recipe-import-url-error") &&
      recipeImport.includes("aria-describedby={errors.title") &&
      recipeImport.includes("aria-describedby={errors.url") &&
      recipeComments.includes('id="recipe-comment-error"') &&
      recipeComments.includes("aria-invalid={Boolean(errorMessage)}") &&
      recipeComments.includes("recipe-comment-error"),
    "field errors must be announced and programmatically tied to the invalid field",
  ],
  [
    "non-color selected state",
    fridge.includes("aria-pressed={viewMode === 'inventory'}") &&
      fridge.includes("aria-pressed={activeTab === tab}") &&
      fridge.includes("aria-pressed={form.category === cat}") &&
      recipeList.includes("aria-pressed={favoritesOnly}") &&
      recipeList.includes("aria-pressed={active}") &&
      recipeList.includes("aria-pressed={quickFilter === filter.id}") &&
      recipeList.includes("aria-pressed={favorite}") &&
      shopping.includes("aria-pressed={selected}") &&
      shopping.includes("aria-pressed={fridgeStorageType === storageType}") &&
      shopping.includes("aria-pressed={checked}") &&
      recipeFavorite.includes("aria-pressed={favorite}"),
    "selected filters, toggles, and purchase state must not rely on color alone",
  ],
  [
    "dialog keyboard navigation",
    fridge.includes('aria-modal="true"') &&
      fridge.includes("addDialogCloseButtonRef.current?.focus()") &&
      fridge.includes("event.key === 'Escape'") &&
      fridge.includes("event.key !== 'Tab'") &&
      fridge.includes("mainScrollContainer.style.overflowY = 'hidden'") &&
      fridge.includes("returnFocusTarget.focus()"),
    "the add-ingredient dialog must receive, trap, dismiss, restore focus, and lock background scrolling",
  ],
  [
    "timer multimodal completion",
    cookMode.includes('role="timer"') &&
      cookMode.includes('aria-live="assertive"') &&
      cookMode.includes("remainingSeconds === 0 ? '완료'") &&
      cookMode.includes("소리·진동과 함께 완료 상태를 표시했어요"),
    "timer completion needs visible text and assertive announcement in addition to sound or vibration",
  ],
  [
    "cook mode readable body",
    cookMode.includes("text-[21px]") && cookMode.includes("leading-[1.55]"),
    "the active cooking instruction needs an enlarged, readable body style",
  ],
  [
    "AA contrast palette",
    auditedContrastPairs.every(([, foreground, background, minimum]) =>
      contrastRatio(foreground, background) >= minimum,
    ) && forbiddenLowContrastTokens.every((token) => !coreSurfaceSource.includes(token)),
    "core surface text, primary actions, and focus indicators need audited AA contrast tokens",
  ],
];

for (const [label, condition, detail] of contracts) {
  if (!condition) failures.push(`${label}: ${detail}`);
}

console.log("Phase 6 mobile accessibility check");
console.log(`Interactive tags scanned: ${interactiveTagCount}`);
console.log(`Contracts checked: ${contracts.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS");
for (const [label, foreground, background] of auditedContrastPairs) {
  console.log(`- ${label} contrast: ${contrastRatio(foreground, background).toFixed(2)}:1`);
}
console.log("- touch target, zoom, names, labels, keyboard, state, timer, and reduced-motion contracts passed");
