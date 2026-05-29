// 이 파일은 출시 전 로컬에서 환경변수와 핵심 라우트 구성을 점검합니다.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFilePath = path.join(cwd, ".env.local");
const androidSigningEnvFilePath = path.join(cwd, ".env.android-signing.local");

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
const REQUIRED_OAUTH_WEBVIEW_HOSTS = [
  "jipbab-note-app.vercel.app",
  "xqelabiwtjntwrjqcteo.supabase.co",
];
const FORBIDDEN_OAUTH_WEBVIEW_HOSTS = [
  "accounts.google.com",
  "appleid.apple.com",
  "kauth.kakao.com",
];

const COUPANG_LINK_KEYS = [
  "NEXT_PUBLIC_COUPANG_PARTNERS_POTATO_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_VEGETABLE_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_EGG_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_DAIRY_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_FROZEN_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_SEASONING_URL",
  "NEXT_PUBLIC_COUPANG_PARTNERS_ITEM_LINKS_JSON",
];
const PARTNER_LINKS_MIGRATION = "supabase/migrations/20260508133307_add_partner_links.sql";
const RECIPE_SOURCES_MIGRATION = "supabase/migrations/20260508133157_add_recipe_sources_and_release_metadata.sql";

const REQUIRED_ROUTE_FILES = [
  ["login", "app/login/page.tsx"],
  ["oauth callback", "app/auth/callback/page.tsx"],
  ["fridge", "app/fridge/page.tsx"],
  ["recipe list", "app/recipe/page.tsx"],
  ["recipe detail", "app/recipe/[id]/page.tsx"],
  ["shopping", "app/shopping/page.tsx"],
  ["privacy", "app/privacy/page.tsx"],
  ["terms", "app/terms/page.tsx"],
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

function missingTerms(source, terms) {
  return terms.filter((term) => !source.includes(term));
}

function hasRequiredOAuthNavigationHosts(capacitorConfig) {
  const allowNavigation = capacitorConfig.server?.allowNavigation;
  return (
    Array.isArray(allowNavigation) &&
    REQUIRED_OAUTH_WEBVIEW_HOSTS.every((host) => allowNavigation.includes(host)) &&
    FORBIDDEN_OAUTH_WEBVIEW_HOSTS.every((host) => !allowNavigation.includes(host))
  );
}

function readProjectFile(relativePath) {
  return readFileSync(path.join(cwd, relativePath), "utf8");
}

function summarizeCheckOutput(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => line.startsWith("PASS -")) ?? lines.find((line) => line.startsWith("FAIL -")) ?? lines.at(-1) ?? "no output";
}

function runProjectCheck(command, args) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });

  if (result.error) {
    return {
      ok: false,
      detail: result.error.message,
    };
  }

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return {
    ok: result.status === 0,
    detail: summarizeCheckOutput(output) || `exit ${result.status ?? "unknown"}`,
  };
}

function resolveProjectPath(value) {
  if (!isPresent(value)) {
    return "";
  }

  return path.isAbsolute(value) ? value : path.join(cwd, value);
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
const androidSigningEnvFromFile = readEnvFile(androidSigningEnvFilePath);
const env = {
  ...envFromFile,
  ...androidSigningEnvFromFile,
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

const communityEnabled = parseBooleanFlag(env.NEXT_PUBLIC_COMMUNITY_ENABLED ?? "false");
if (communityEnabled === "invalid") {
  addResult(results, "fail", "NEXT_PUBLIC_COMMUNITY_ENABLED", "must be true, false, 1, or 0");
} else if (communityEnabled === true) {
  addResult(
    results,
    "fail",
    "Community launch gate",
    "public community must stay disabled until report/block/admin moderation and spam controls are release-ready",
  );
} else {
  addResult(results, "pass", "Community launch gate", "community is hidden for the release candidate");
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

const privacyPagePath = "app/privacy/page.tsx";
if (existsSync(path.join(cwd, privacyPagePath))) {
  const privacyPage = readProjectFile(privacyPagePath);
  const missingPrivacyTerms = missingTerms(privacyPage, [
    "Supabase",
    "Vercel",
    "Kakao/Google/Apple",
    "식품안전나라",
    "쿠팡 파트너스",
    "유통기한 알림",
    "계정 삭제",
    "RLS",
    "getSupportEmail",
    "개인정보보호위원회",
    "118",
  ]);

  if (missingPrivacyTerms.length === 0) {
    addResult(results, "pass", "Privacy policy content", "data categories, processors, local notifications, deletion rights, support, and RLS are disclosed");
  } else {
    addResult(results, "fail", "Privacy policy content", `missing term(s): ${missingPrivacyTerms.join(", ")}`);
  }
}

const termsPagePath = "app/terms/page.tsx";
if (existsSync(path.join(cwd, termsPagePath))) {
  const termsPage = readProjectFile(termsPagePath);
  const missingTermsPageTerms = missingTerms(termsPage, [
    "정보의 한계",
    "알레르기",
    "계정 삭제",
    "외부 링크",
    "제휴 링크",
    "금지 행위",
    "서비스 변경과 중단",
  ]);

  if (missingTermsPageTerms.length === 0) {
    addResult(results, "pass", "Terms content", "service scope, safety limits, external links, account deletion, prohibited acts, and service changes are disclosed");
  } else {
    addResult(results, "fail", "Terms content", `missing term(s): ${missingTermsPageTerms.join(", ")}`);
  }
}

const supportPagePath = "app/support/page.tsx";
if (existsSync(path.join(cwd, supportPagePath))) {
  const supportPage = readProjectFile(supportPagePath);
  const missingSupportTerms = missingTerms(supportPage, [
    "getSupportEmail",
    "getSupportMailtoUrl",
    "/account-delete",
    "개인정보 처리방침 URL",
    "쿠팡 파트너스",
    "소셜 로그인 리디렉트 URL",
  ]);

  if (missingSupportTerms.length === 0) {
    addResult(results, "pass", "Support content", "support email, data requests, partner link correction, account deletion, and external console checks are documented");
  } else {
    addResult(results, "fail", "Support content", `missing term(s): ${missingSupportTerms.join(", ")}`);
  }
}

const accountDeletePagePath = "app/account-delete/page.tsx";
if (existsSync(path.join(cwd, accountDeletePagePath))) {
  const accountDeletePage = readProjectFile(accountDeletePagePath);
  const missingAccountDeleteTerms = missingTerms(accountDeletePage, [
    "account_deletion_requests",
    "로그인 계정 정보",
    "냉장고 재료",
    "장보기",
    "즐겨찾기",
    "커뮤니티",
    "메일로도 요청 가능",
    "삭제 완료",
  ]);

  if (missingAccountDeleteTerms.length === 0) {
    addResult(results, "pass", "Account deletion content", "in-app request flow, deletion scope, status tracking, and support fallback are present");
  } else {
    addResult(results, "fail", "Account deletion content", `missing term(s): ${missingAccountDeleteTerms.join(", ")}`);
  }
}

const appStoreMetadataPath = "docs/app-store-connect-metadata-ko.md";
if (existsSync(path.join(cwd, appStoreMetadataPath))) {
  const appStoreMetadata = readProjectFile(appStoreMetadataPath);
  const missingAppStoreTerms = missingTerms(appStoreMetadata, [
    "집밥노트",
    "com.jipbab.note",
    "개인정보 처리방침 URL",
    "App Review 메모",
    "Apple 로그인",
    "Google 로그인",
    "계정 삭제",
    "외부 쇼핑 링크",
    "커뮤니티 작성/댓글 기능을 열지 않고",
    "TestFlight - What to Test",
  ]);

  if (missingAppStoreTerms.length === 0) {
    addResult(results, "pass", "App Store metadata content", "review notes, auth parity, deletion flow, external links, community gating, and test scope are documented");
  } else {
    addResult(results, "fail", "App Store metadata content", `missing term(s): ${missingAppStoreTerms.join(", ")}`);
  }
}

const playStoreMetadataPath = "docs/play-store-metadata-ko.md";
if (existsSync(path.join(cwd, playStoreMetadataPath))) {
  const playStoreMetadata = readProjectFile(playStoreMetadataPath);
  const missingPlayStoreTerms = missingTerms(playStoreMetadata, [
    "com.jipbab.note",
    "데이터 보안",
    "이메일 주소",
    "앱 활동",
    "기기 또는 기타 ID",
    "HTTPS",
    "계정 삭제 요청",
    "개인정보 처리방침 URL",
    "지원 URL",
    "내부 테스트 트랙",
  ]);

  if (missingPlayStoreTerms.length === 0) {
    addResult(results, "pass", "Play Store metadata content", "listing identity, data safety, privacy/support URLs, permissions, and internal testing scope are documented");
  } else {
    addResult(results, "fail", "Play Store metadata content", `missing term(s): ${missingPlayStoreTerms.join(", ")}`);
  }
}

const packageJsonPath = "package.json";
if (existsSync(path.join(cwd, packageJsonPath))) {
  const packageJson = JSON.parse(readProjectFile(packageJsonPath));
  const dependencies = packageJson.dependencies ?? {};
  if (dependencies["@capacitor/local-notifications"]) {
    addResult(results, "pass", "@capacitor/local-notifications", "native local notification plugin is installed");
  } else {
    addResult(results, "fail", "@capacitor/local-notifications", "native local notification plugin is required for release alarm claims");
  }

  if (dependencies["@capacitor/app"] && dependencies["@capacitor/browser"]) {
    addResult(results, "pass", "Native OAuth plugins", "Capacitor App and Browser plugins are installed for system-browser OAuth");
  } else {
    addResult(results, "fail", "Native OAuth plugins", "@capacitor/app and @capacitor/browser are required for Google-safe OAuth");
  }
} else {
  addResult(results, "fail", packageJsonPath, "package.json is missing");
}

const curatedRecipesPath = "lib/curated-recipes.ts";
let curatedThumbnailPaths = [];
if (existsSync(path.join(cwd, curatedRecipesPath))) {
  const curatedRecipesSource = readProjectFile(curatedRecipesPath);
  const curatedRecipeCount = countMatches(curatedRecipesSource, /id:\s*"curated-/g);

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

  const beginnerGuidanceCheck = runProjectCheck("node", [
    "--experimental-strip-types",
    "scripts/check-curated-beginner-guidance.mjs",
  ]);
  if (beginnerGuidanceCheck.ok) {
    addResult(results, "pass", "Beginner recipe guidance", beginnerGuidanceCheck.detail);
  } else {
    addResult(
      results,
      "fail",
      "Beginner recipe guidance",
      beginnerGuidanceCheck.detail,
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

const androidGradlePath = path.join(cwd, "android/app/build.gradle");
if (existsSync(androidGradlePath)) {
  const androidGradle = readFileSync(androidGradlePath, "utf8");
  const hasReleaseIdentity =
    /applicationId\s+"com\.jipbab\.note"/.test(androidGradle) &&
    /versionName\s+"1\.0"/.test(androidGradle) &&
    /versionCode\s+1\b/.test(androidGradle);

  if (hasReleaseIdentity) {
    addResult(results, "pass", "Android release identity", "applicationId, versionName, and versionCode are configured");
  } else {
    addResult(results, "fail", "Android release identity", "expected applicationId com.jipbab.note, versionName 1.0, versionCode 1");
  }
} else {
  addResult(results, "fail", "android/app/build.gradle", "Android app Gradle file is missing");
}

const androidSigningKeys = [
  "ANDROID_UPLOAD_KEYSTORE_PATH",
  "ANDROID_UPLOAD_KEYSTORE_PASSWORD",
  "ANDROID_UPLOAD_KEY_ALIAS",
  "ANDROID_UPLOAD_KEY_PASSWORD",
];
const missingAndroidSigningKeys = androidSigningKeys.filter((key) => !isPresent(env[key]) || isPlaceholder(env[key]));
const androidKeystorePath = resolveProjectPath(env.ANDROID_UPLOAD_KEYSTORE_PATH ?? "");
if (missingAndroidSigningKeys.length > 0) {
  addResult(
    results,
    "fail",
    "Android upload signing",
    `missing release upload signing value(s): ${missingAndroidSigningKeys.join(", ")}`,
  );
} else if (!existsSync(androidKeystorePath)) {
  addResult(results, "fail", "Android upload keystore", "ANDROID_UPLOAD_KEYSTORE_PATH does not point to an existing file");
} else {
  addResult(results, "pass", "Android upload signing", "upload keystore path and signing values are configured");
}

const androidManifestPath = path.join(cwd, "android/app/src/main/AndroidManifest.xml");
if (existsSync(androidManifestPath)) {
  const androidManifest = readFileSync(androidManifestPath, "utf8");
  const hasInternet = androidManifest.includes('android.permission.INTERNET');
  const hasCamera = androidManifest.includes('android.permission.CAMERA');
  const cameraOptional = /android\.hardware\.camera"[\s\S]*android:required="false"/.test(androidManifest);
  const launcherExported = /android:name="\.MainActivity"[\s\S]*android:exported="true"/.test(androidManifest);

  if (hasInternet && hasCamera && cameraOptional && launcherExported) {
    addResult(results, "pass", "Android manifest", "internet, optional camera, and launcher export settings are configured");
  } else {
    addResult(
      results,
      "fail",
      "Android manifest",
      "must include internet permission, optional camera feature, camera permission, and exported launcher activity",
    );
  }
} else {
  addResult(results, "fail", "android/app/src/main/AndroidManifest.xml", "Android manifest is missing");
}

const androidCapacitorConfigPath = path.join(cwd, "android/app/src/main/assets/capacitor.config.json");
if (existsSync(androidCapacitorConfigPath)) {
  const androidCapacitorConfig = JSON.parse(readFileSync(androidCapacitorConfigPath, "utf8"));
  const serverUrl = androidCapacitorConfig.server?.url ?? "";
  if (
    androidCapacitorConfig.appId === "com.jipbab.note" &&
    androidCapacitorConfig.appName === "집밥노트" &&
    typeof serverUrl === "string" &&
    serverUrl.startsWith("https://") &&
    androidCapacitorConfig.server?.cleartext === false &&
    hasRequiredOAuthNavigationHosts(androidCapacitorConfig)
  ) {
    addResult(results, "pass", "Android Capacitor config", "release WebView URL is HTTPS, app hosts stay in WebView, provider OAuth hosts stay out, and cleartext is disabled");
  } else {
    addResult(results, "fail", "Android Capacitor config", "must use com.jipbab.note, 집밥노트, HTTPS server URL, app allowNavigation hosts only, provider OAuth outside WebView, and cleartext=false");
  }
} else {
  addResult(results, "fail", "android/app/src/main/assets/capacitor.config.json", "Android Capacitor config is missing");
}

const iosCapacitorConfigPath = path.join(cwd, "ios/App/App/capacitor.config.json");
if (existsSync(iosCapacitorConfigPath)) {
  const iosCapacitorConfig = JSON.parse(readFileSync(iosCapacitorConfigPath, "utf8"));
  const serverUrl = iosCapacitorConfig.server?.url ?? "";
  const packageClassList = Array.isArray(iosCapacitorConfig.packageClassList)
    ? iosCapacitorConfig.packageClassList
    : [];

  if (
    iosCapacitorConfig.appId === "com.jipbab.note" &&
    iosCapacitorConfig.appName === "집밥노트" &&
    typeof serverUrl === "string" &&
    serverUrl.startsWith("https://") &&
    serverUrl === capacitorServerUrl &&
    iosCapacitorConfig.server?.cleartext === false &&
    hasRequiredOAuthNavigationHosts(iosCapacitorConfig) &&
    packageClassList.includes("AppPlugin") &&
    packageClassList.includes("BrowserPlugin") &&
    packageClassList.includes("LocalNotificationsPlugin")
  ) {
    addResult(results, "pass", "iOS Capacitor config", "release WebView URL, app-only allowNavigation, native OAuth plugins, cleartext, app identity, and local notifications plugin are configured");
  } else {
    addResult(
      results,
      "fail",
      "iOS Capacitor config",
      "must use com.jipbab.note, 집밥노트, CAPACITOR_SERVER_URL HTTPS URL, app-only allowNavigation hosts, cleartext=false, AppPlugin, BrowserPlugin, and LocalNotificationsPlugin",
    );
  }
} else {
  addResult(results, "fail", "ios/App/App/capacitor.config.json", "iOS Capacitor config is missing");
}

const iosInfoPlistPath = path.join(cwd, "ios/App/App/Info.plist");
if (existsSync(iosInfoPlistPath)) {
  const iosInfoPlist = readFileSync(iosInfoPlistPath, "utf8");
  const hasDisplayName = /<key>CFBundleDisplayName<\/key>\s*<string>집밥노트<\/string>/.test(iosInfoPlist);
  const hasCameraUsage =
    /<key>NSCameraUsageDescription<\/key>\s*<string>[^<]*바코드[^<]*<\/string>/.test(iosInfoPlist);
  const hasEncryptionDeclaration = /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(iosInfoPlist);
  const hasNativeAuthScheme =
    /<key>CFBundleURLSchemes<\/key>[\s\S]*<string>com\.jipbab\.note<\/string>/.test(iosInfoPlist);
  const hasPortraitOrientation =
    iosInfoPlist.includes("<string>UIInterfaceOrientationPortrait</string>") &&
    !iosInfoPlist.includes("<string>UIInterfaceOrientationLandscape");

  if (hasDisplayName && hasCameraUsage && hasEncryptionDeclaration && hasNativeAuthScheme && hasPortraitOrientation) {
    addResult(results, "pass", "iOS Info.plist", "display name, camera purpose, encryption declaration, native auth URL scheme, and portrait orientation are configured");
  } else {
    addResult(
      results,
      "fail",
      "iOS Info.plist",
      "must define 집밥노트 display name, barcode camera purpose text, ITSAppUsesNonExemptEncryption=false, com.jipbab.note URL scheme, and portrait-only orientation",
    );
  }
} else {
  addResult(results, "fail", "ios/App/App/Info.plist", "iOS Info.plist is missing");
}

const iosSpmPackagePath = path.join(cwd, "ios/App/CapApp-SPM/Package.swift");
if (existsSync(iosSpmPackagePath)) {
  const iosSpmPackage = readFileSync(iosSpmPackagePath, "utf8");
  if (
    iosSpmPackage.includes('platforms: [.iOS(.v15)]') &&
    iosSpmPackage.includes('exact: "8.3.1"') &&
    iosSpmPackage.includes('package(name: "CapacitorLocalNotifications"') &&
    iosSpmPackage.includes('product(name: "CapacitorLocalNotifications"')
  ) {
    addResult(results, "pass", "iOS SPM package", "Capacitor 8.3.1, iOS 15 target, and local notifications dependency are pinned");
  } else {
    addResult(
      results,
      "fail",
      "iOS SPM package",
      "must pin Capacitor 8.3.1, target iOS 15, and include CapacitorLocalNotifications",
    );
  }
} else {
  addResult(results, "fail", "ios/App/CapApp-SPM/Package.swift", "iOS SPM package is missing");
}

const runtimeAppConfigPath = path.join(cwd, "capacitor-shell/runtime-app-config.json");
if (existsSync(runtimeAppConfigPath)) {
  const runtimeAppConfig = JSON.parse(readFileSync(runtimeAppConfigPath, "utf8"));
  if (runtimeAppConfig.remoteUrl === capacitorServerUrl && isHttpsUrl(runtimeAppConfig.remoteUrl)) {
    addResult(results, "pass", "Runtime app config", "Capacitor shell runtime remote URL matches CAPACITOR_SERVER_URL");
  } else {
    addResult(results, "fail", "Runtime app config", "Capacitor shell runtime remoteUrl must match CAPACITOR_SERVER_URL and use HTTPS");
  }
} else {
  addResult(results, "fail", "capacitor-shell/runtime-app-config.json", "runtime app config is missing");
}

if (!isPresent(env.MFDS_API_KEY) && !isPresent(env.FOODSAFETY_API_KEY)) {
  addResult(results, "warn", "MFDS_API_KEY or FOODSAFETY_API_KEY", "missing; recipe fallback uses stored data only");
}

if (existsSync(path.join(cwd, PARTNER_LINKS_MIGRATION))) {
  addResult(results, "pass", "partner_links migration", "DB-managed Coupang partner links are configured");
} else {
  addResult(results, "fail", "partner_links migration", "DB-managed Coupang partner links migration is missing");
}

if (existsSync(path.join(cwd, RECIPE_SOURCES_MIGRATION))) {
  const recipeSourcesMigration = readProjectFile(RECIPE_SOURCES_MIGRATION);
  if (
    recipeSourcesMigration.includes("public.recipe_sources") &&
    recipeSourcesMigration.includes("content_origin") &&
    recipeSourcesMigration.includes("reviewed_for_beginner") &&
    recipeSourcesMigration.includes("enable row level security") &&
    recipeSourcesMigration.includes("recipe_sources_insert_service_role")
  ) {
    addResult(results, "pass", "Recipe source metadata", "source ledger, RLS, content origin, and beginner review flags are configured");
  } else {
    addResult(results, "fail", "Recipe source metadata", "migration must define source ledger, RLS, content origin, and beginner review flags");
  }
} else {
  addResult(results, "fail", "Recipe source metadata", "recipe source metadata migration is missing");
}

if (!COUPANG_LINK_KEYS.some((key) => isPresent(env[key]))) {
  addResult(
    results,
    "warn",
    "Coupang partner env fallback",
    "missing; shopping flow depends on Supabase partner_links rows or Coupang search fallback",
  );
}

addResult(results, "warn", "Real-device login QA", "manual verification still required");
addResult(results, "warn", "Local notification QA", "manual permission, scheduling, and delivery checks still required");
addResult(results, "warn", "App Store Connect", "metadata, privacy answers, screenshots, and review notes are manual");
addResult(results, "warn", "External provider dashboards", "Supabase/Google/Apple/Kakao consoles are manual");

const passes = results.filter((item) => item.level === "pass");
const warnings = results.filter((item) => item.level === "warn");
const failures = results.filter((item) => item.level === "fail");

console.log("Release readiness check");
const envSources = [
  existsSync(envFilePath) ? ".env.local" : null,
  existsSync(androidSigningEnvFilePath) ? ".env.android-signing.local" : null,
  "process.env",
].filter(Boolean);
console.log(`Environment source: ${envSources.join(" + ")}`);
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
