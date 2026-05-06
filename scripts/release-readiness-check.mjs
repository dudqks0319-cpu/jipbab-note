// 이 파일은 출시 전 로컬에서 환경변수와 핵심 라우트 구성을 점검합니다.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFilePath = path.join(cwd, ".env.local");

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAILS",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "CAPACITOR_SERVER_URL",
  "NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS",
  "NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED",
  "NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED",
  "NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED",
];

const COUPANG_LINK_KEYS = [
  "NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_DAIRY_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_FROZEN_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_SEASONING_URL",
];

const REQUIRED_ROUTE_FILES = [
  ["login", "app/login/page.tsx"],
  ["oauth callback", "app/auth/callback/page.tsx"],
  ["fridge", "app/fridge/page.tsx"],
  ["recipe list", "app/recipe/page.tsx"],
  ["recipe detail", "app/recipe/[id]/page.tsx"],
  ["shopping", "app/shopping/page.tsx"],
  ["account delete", "app/account-delete/page.tsx"],
  ["account deletion api", "app/api/account-deletion-requests/route.ts"],
  ["admin account deletions", "app/admin/account-deletions/page.tsx"],
];

const REQUIRED_STORE_FILES = [
  ["App Store metadata", "docs/app-store-connect-metadata-ko.md"],
  ["Play Store metadata", "docs/play-store-metadata-ko.md"],
  ["Release checklist", "docs/release-readiness-checklist.md"],
  ["Ingredient image sources", "public/images/ingredients/SOURCES.md"],
  ["Recipe image sources", "public/images/recipes/SOURCES.md"],
];

const MIN_CURATED_RECIPE_COUNT = 20;
const MIN_CURATED_RECIPE_IMAGE_COUNT = 20;
const MIN_INGREDIENT_CATALOG_COUNT = 160;

const SUPPORTED_OAUTH_PROVIDERS = new Set(["google", "apple", "kakao"]);
const TRUE_VALUES = new Set(["true", "1"]);
const FALSE_VALUES = new Set(["false", "0"]);

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf8");
  const pairs = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    pairs[key] = value;
  }

  return pairs;
}

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlaceholder(value) {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.includes("your-") ||
    normalized.includes("<your") ||
    normalized.includes("example") ||
    normalized === "changeme"
  );
}

function parseBooleanFlag(value) {
  if (!isPresent(value)) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return "invalid";
}

function parseProviderList(value) {
  if (!isPresent(value)) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isHttpsUrl(value) {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function addResult(results, level, label, detail) {
  results.push({ level, label, detail });
}

function countMatches(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function readProjectFile(relativePath) {
  return readFileSync(path.join(cwd, relativePath), "utf8");
}

function printSection(title, items) {
  if (items.length === 0) {
    return;
  }

  console.log(`\n${title}`);
  for (const item of items) {
    console.log(`- ${item.label}${item.detail ? `: ${item.detail}` : ""}`);
  }
}

const envFromFile = readEnvFile(envFilePath);
const env = {
  ...envFromFile,
  ...process.env,
};
const results = [];

for (const key of REQUIRED_ENV_KEYS) {
  const value = env[key];

  if (!isPresent(value)) {
    addResult(results, "fail", key, "missing or empty");
    continue;
  }

  if (isPlaceholder(value)) {
    addResult(results, "fail", key, "placeholder value still appears to be configured");
    continue;
  }

  addResult(results, "pass", key, "present");
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
if (isPresent(supabaseUrl) && !isHttpsUrl(supabaseUrl)) {
  addResult(results, "fail", "NEXT_PUBLIC_SUPABASE_URL", "must be an HTTPS URL");
}

const supportEmail = env.NEXT_PUBLIC_SUPPORT_EMAIL;
if (isPresent(supportEmail) && !isEmail(supportEmail)) {
  addResult(results, "fail", "NEXT_PUBLIC_SUPPORT_EMAIL", "must look like an email address");
}

const adminEmails = env.ADMIN_EMAILS;
if (isPresent(adminEmails)) {
  const emails = adminEmails
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (emails.length === 0 || emails.some((email) => !isEmail(email))) {
    addResult(results, "fail", "ADMIN_EMAILS", "must contain comma-separated email addresses");
  }
}

const capacitorServerUrl = env.CAPACITOR_SERVER_URL;
if (isPresent(capacitorServerUrl) && !isHttpsUrl(capacitorServerUrl)) {
  addResult(results, "fail", "CAPACITOR_SERVER_URL", "release builds must use a public HTTPS URL");
}

const providerList = parseProviderList(env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS);
const unknownProviders = providerList.filter((provider) => !SUPPORTED_OAUTH_PROVIDERS.has(provider));
if (unknownProviders.length > 0) {
  addResult(
    results,
    "fail",
    "NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS",
    `unsupported provider(s): ${unknownProviders.join(", ")}`,
  );
}

const providerFlags = {
  google: parseBooleanFlag(env.NEXT_PUBLIC_SUPABASE_OAUTH_GOOGLE_ENABLED),
  kakao: parseBooleanFlag(env.NEXT_PUBLIC_SUPABASE_OAUTH_KAKAO_ENABLED),
  apple: parseBooleanFlag(env.NEXT_PUBLIC_SUPABASE_OAUTH_APPLE_ENABLED),
};

for (const [provider, flag] of Object.entries(providerFlags)) {
  if (flag === "invalid") {
    addResult(
      results,
      "fail",
      `NEXT_PUBLIC_SUPABASE_OAUTH_${provider.toUpperCase()}_ENABLED`,
      "must be true, false, 1, or 0",
    );
  }
}

const enabledProviders = Object.entries(providerFlags)
  .filter(([, flag]) => flag === true)
  .map(([provider]) => provider);

if (enabledProviders.length === 0) {
  addResult(results, "fail", "OAuth providers", "at least one provider flag must be enabled");
}

if ((providerFlags.google === true || providerFlags.kakao === true) && providerFlags.apple !== true) {
  addResult(
    results,
    "fail",
    "Apple OAuth",
    "Apple must be enabled when Google or Kakao social login is enabled for App Store review",
  );
}

for (const provider of enabledProviders) {
  if (!providerList.includes(provider)) {
    addResult(
      results,
      "warn",
      "OAuth provider list",
      `${provider} is enabled by flag but missing from NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDERS`,
    );
  }
}

if (providerFlags.google !== true) {
  addResult(results, "warn", "Google OAuth", "disabled; update Google real-device QA expectations");
}

if (providerFlags.kakao !== true) {
  addResult(results, "warn", "Kakao OAuth", "disabled; skip or update Kakao real-device QA expectations");
}

for (const [label, relativePath] of REQUIRED_ROUTE_FILES) {
  if (existsSync(path.join(cwd, relativePath))) {
    addResult(results, "pass", relativePath, `${label} route exists`);
  } else {
    addResult(results, "fail", relativePath, `${label} route is missing`);
  }
}

if (!existsSync(path.join(cwd, "capacitor.config.ts"))) {
  addResult(results, "fail", "capacitor.config.ts", "Capacitor config is missing");
}

for (const [label, relativePath] of REQUIRED_STORE_FILES) {
  if (existsSync(path.join(cwd, relativePath))) {
    addResult(results, "pass", relativePath, `${label} file exists`);
  } else {
    addResult(results, "fail", relativePath, `${label} file is missing`);
  }
}

const curatedRecipesPath = "lib/curated-recipes.ts";
let curatedThumbnailPaths = [];
if (existsSync(path.join(cwd, curatedRecipesPath))) {
  const curatedRecipesSource = readProjectFile(curatedRecipesPath);
  const curatedRecipeCount = countMatches(curatedRecipesSource, /id:\s*"curated-/g);
  const beginnerTipCount = countMatches(curatedRecipesSource, /beginnerTip:\s*"/g);
  const visualCueCount = countMatches(curatedRecipesSource, /visualCue:\s*"/g);
  const beginnerSummaryCount = countMatches(curatedRecipesSource, /beginnerSummary:\s*"/g);
  const measurementTipsCount = countMatches(curatedRecipesSource, /measurementTips:\s*DEFAULT_MEASUREMENT_TIPS/g);

  curatedThumbnailPaths = Array.from(
    curatedRecipesSource.matchAll(/thumbnailUrl:\s*"([^"]+)"/g),
    (match) => match[1],
  );

  if (curatedRecipeCount >= MIN_CURATED_RECIPE_COUNT) {
    addResult(results, "pass", "Curated beginner recipes", `${curatedRecipeCount} recipes configured`);
  } else {
    addResult(
      results,
      "fail",
      "Curated beginner recipes",
      `${curatedRecipeCount}/${MIN_CURATED_RECIPE_COUNT} recipes configured`,
    );
  }

  if (
    beginnerSummaryCount >= curatedRecipeCount &&
    measurementTipsCount >= curatedRecipeCount &&
    beginnerTipCount >= curatedRecipeCount * 4 &&
    visualCueCount >= curatedRecipeCount * 4
  ) {
    addResult(results, "pass", "Beginner recipe guidance", "summary, measurement tips, beginner tips, and visual cues present");
  } else {
    addResult(
      results,
      "fail",
      "Beginner recipe guidance",
      "each curated recipe must include beginner summary, measurement tips, step tips, and visual cues",
    );
  }

  const missingThumbnails = curatedThumbnailPaths.filter((thumbnailPath) => {
    if (!thumbnailPath.startsWith("/images/recipes/")) {
      return true;
    }

    return !existsSync(path.join(cwd, "public", thumbnailPath));
  });

  if (curatedThumbnailPaths.length >= curatedRecipeCount && missingThumbnails.length === 0) {
    addResult(results, "pass", "Curated recipe thumbnails", "all curated recipes use local recipe images");
  } else {
    addResult(
      results,
      "fail",
      "Curated recipe thumbnails",
      missingThumbnails.length > 0
        ? `missing or non-local thumbnail(s): ${missingThumbnails.join(", ")}`
        : "not every curated recipe has a local thumbnail",
    );
  }
} else {
  addResult(results, "fail", curatedRecipesPath, "curated recipe seed is missing");
}

const recipeImageSourcesPath = "public/images/recipes/SOURCES.md";
if (existsSync(path.join(cwd, recipeImageSourcesPath)) && curatedThumbnailPaths.length > 0) {
  const recipeImageSources = readProjectFile(recipeImageSourcesPath);
  const missingSourceEntries = curatedThumbnailPaths
    .map((thumbnailPath) => thumbnailPath.replace(/^\/images\/recipes\//, ""))
    .filter((relativePath) => !recipeImageSources.includes(relativePath));

  if (missingSourceEntries.length === 0 && recipeImageSources.includes("not copied from competitor apps")) {
    addResult(results, "pass", "Recipe image provenance", "all curated thumbnails are documented as release-safe assets");
  } else {
    addResult(
      results,
      "fail",
      "Recipe image provenance",
      missingSourceEntries.length > 0
        ? `missing source entry: ${missingSourceEntries.join(", ")}`
        : "competitor-copy prohibition is missing from recipe image source ledger",
    );
  }
}

const curatedRecipeImageDir = path.join(cwd, "public/images/recipes/jipbab-curated");
if (existsSync(curatedRecipeImageDir)) {
  const curatedRecipeImageCount = readdirSync(curatedRecipeImageDir).filter((fileName) =>
    /\.(png|jpe?g|webp)$/i.test(fileName),
  ).length;

  if (curatedRecipeImageCount >= MIN_CURATED_RECIPE_IMAGE_COUNT) {
    addResult(results, "pass", "Curated recipe image batch", `${curatedRecipeImageCount} local images available`);
  } else {
    addResult(
      results,
      "fail",
      "Curated recipe image batch",
      `${curatedRecipeImageCount}/${MIN_CURATED_RECIPE_IMAGE_COUNT} local images available`,
    );
  }
} else {
  addResult(results, "fail", "public/images/recipes/jipbab-curated", "curated recipe image folder is missing");
}

const ingredientCatalogPath = "lib/ingredient-catalog.ts";
if (existsSync(path.join(cwd, ingredientCatalogPath))) {
  const ingredientCatalogSource = readProjectFile(ingredientCatalogPath);
  const ingredientCatalogCount = countMatches(ingredientCatalogSource, /\{\s*id:\s*"/g);
  const requiredCompetitiveItems = ["고추", "맛술", "당면", "토마토캔"];
  const missingCompetitiveItems = requiredCompetitiveItems.filter(
    (itemName) => !ingredientCatalogSource.includes(`name: "${itemName}"`),
  );

  if (ingredientCatalogCount >= MIN_INGREDIENT_CATALOG_COUNT && missingCompetitiveItems.length === 0) {
    addResult(results, "pass", "Ingredient catalog coverage", `${ingredientCatalogCount} ingredients with key Korean staples`);
  } else {
    addResult(
      results,
      "fail",
      "Ingredient catalog coverage",
      missingCompetitiveItems.length > 0
        ? `missing competitive item(s): ${missingCompetitiveItems.join(", ")}`
        : `${ingredientCatalogCount}/${MIN_INGREDIENT_CATALOG_COUNT} ingredients configured`,
    );
  }
} else {
  addResult(results, "fail", ingredientCatalogPath, "ingredient catalog is missing");
}

const androidStringsPath = path.join(cwd, "android/app/src/main/res/values/strings.xml");
if (existsSync(androidStringsPath)) {
  const androidStrings = readFileSync(androidStringsPath, "utf8");
  if (
    androidStrings.includes('<string name="app_name">집밥노트</string>') &&
    androidStrings.includes('<string name="title_activity_main">집밥노트</string>')
  ) {
    addResult(results, "pass", "Android app label", "집밥노트 display name configured");
  } else {
    addResult(results, "fail", "Android app label", "android strings.xml must use 집밥노트 for app_name and title_activity_main");
  }
} else {
  addResult(results, "fail", "android/app/src/main/res/values/strings.xml", "Android strings file is missing");
}

if (!isPresent(env.MFDS_API_KEY) && !isPresent(env.FOODSAFETY_API_KEY)) {
  addResult(results, "warn", "MFDS_API_KEY or FOODSAFETY_API_KEY", "missing; recipe fallback uses stored data only");
}

for (const key of COUPANG_LINK_KEYS) {
  if (!isPresent(env[key])) {
    addResult(results, "warn", key, "missing; shopping flow uses Coupang search fallback");
  }
}

addResult(results, "warn", "Real-device login QA", "manual verification still required");
addResult(results, "warn", "Camera and barcode QA", "manual permission and scanning checks still required");
addResult(results, "warn", "App Store Connect", "metadata, privacy answers, screenshots, and review notes are manual");
addResult(results, "warn", "External provider dashboards", "Supabase/Google/Apple/Kakao consoles are manual");

const passes = results.filter((item) => item.level === "pass");
const warnings = results.filter((item) => item.level === "warn");
const failures = results.filter((item) => item.level === "fail");

console.log("Release readiness check");
console.log(`Environment source: ${existsSync(envFilePath) ? ".env.local + process.env" : "process.env only"}`);
console.log(`Hard blockers: ${failures.length}`);
console.log(`Warnings: ${warnings.length}`);

printSection("PASS", passes);
printSection("WARN", warnings);
printSection("FAIL", failures);

if (failures.length > 0) {
  console.error(`\nRelease readiness check failed with ${failures.length} hard blocker(s).`);
  process.exit(1);
}

console.log("\nRelease readiness check passed. Complete real-device QA before release.");
