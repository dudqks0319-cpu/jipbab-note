// 이 파일은 Phase 6 브라우저 E2E 실행기와 데모 모드의 외부 API 차단 계약을 정적으로 검사합니다.
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const captureSource = readFileSync("scripts/capture-phase-6-e2e-negative.mjs", "utf8");
const happyCaptureSource = readFileSync("scripts/capture-phase-6-e2e-happy.mjs", "utf8");
const chromePathSource = readFileSync("scripts/lib/chrome-path.mjs", "utf8");
const fixtureSource = readFileSync("lib/phase-6-e2e-fixture.ts", "utf8");
const workflowSource = readFileSync(".github/workflows/release-gate.yml", "utf8");
const fixtureSessionSource = readFileSync("app/api/test/fixture-session/route.ts", "utf8");
const artifactRedactionSource = readFileSync("scripts/lib/e2e-artifact-redaction.mjs", "utf8");
const homeSource = readFileSync("app/page.tsx", "utf8");
const recipeListSource = readFileSync("app/recipe/page.tsx", "utf8");
const demoModeSource = readFileSync("hooks/useDemoMode.ts", "utf8");

const contracts = [
  {
    name: "runtime command",
    pass:
      packageJson.scripts?.["capture:phase6-e2e-negative"] ===
      "node scripts/capture-phase-6-e2e-negative.mjs",
  },
  {
    name: "guest first-use and persistence flow",
    pass:
      captureSource.includes("있는 재료만 골라주세요") &&
      captureSource.includes("starter-ingredient-계란") &&
      captureSource.includes("starter-submit") &&
      captureSource.includes("보관 2개") &&
      captureSource.includes("Page.reload"),
  },
  {
    name: "publication fail-closed browser flow",
    pass:
      captureSource.includes("현재 공개 가능한 레시피를 준비 중이에요.") &&
      captureSource.includes("레시피 서비스를 점검하고 있습니다.") &&
      captureSource.includes("레시피를 불러오지 못했습니다.") &&
      captureSource.includes("출처, 안전 안내와 실제 조리를 확인한 레시피만 공개합니다."),
  },
  {
    name: "authorization and input negative paths",
    pass:
      captureSource.includes("/api/family-groups") &&
      captureSource.includes("/api/auth/merge-anonymous") &&
      captureSource.includes("/api/account/delete"),
  },
  {
    name: "demo home does not call unpublished recipe API",
    pass:
      homeSource.includes("useDemoModeState()") &&
      /useRecipeCatalog\(12, \{[\s\S]{0,260}enabled: demoModeReady && !isAppStoreDemo/.test(homeSource),
  },
  {
    name: "demo recipe list does not call unpublished recipe API",
    pass:
      recipeListSource.includes("useDemoModeState()") &&
      recipeListSource.includes("enabled: urlStateReady && demoModeReady && !isAppStoreDemo"),
  },
  {
    name: "demo detection blocks requests until query state is ready",
    pass:
      demoModeSource.includes("export function useDemoModeState") &&
      demoModeSource.includes("ready: false") &&
      demoModeSource.includes("ready: true"),
  },
  {
    name: "portable Chrome discovery",
    pass:
      captureSource.includes("resolveChromeExecutable") &&
      chromePathSource.includes("Google Chrome for Testing") &&
      chromePathSource.includes("/usr/bin/google-chrome") &&
      chromePathSource.includes("CHROME_PATH"),
  },
  {
    name: "technical fixture is production-blocked",
    pass:
      fixtureSource.includes('env.APP_ENV === "production"') &&
      fixtureSource.includes('env.VERCEL_ENV === "production"') &&
      fixtureSource.includes("PHASE6_E2E_FIXTURE_TOKEN") &&
      fixtureSource.includes("isTestFixture: true") &&
      fixtureSource.includes("PHASE6_E2E_FIXTURE_COOKIE") &&
      fixtureSessionSource.includes("httpOnly: true") &&
      fixtureSessionSource.includes('sameSite: "strict"') &&
      fixtureSessionSource.includes("status: 404"),
  },
  {
    name: "full happy path and artifacts",
    pass:
      packageJson.scripts?.["capture:phase6-e2e-happy"] ===
        "node scripts/capture-phase-6-e2e-happy.mjs" &&
      happyCaptureSource.includes("recommendation_api_200") &&
      happyCaptureSource.includes("timer_reload_restored") &&
      happyCaptureSource.includes("cooking_completed") &&
      happyCaptureSource.includes("phase6-e2e-mobile-390.png") &&
      happyCaptureSource.includes("phase6-e2e-desktop-1280.png") &&
      happyCaptureSource.includes("humanReviewCounted: false") &&
      happyCaptureSource.includes("fixture_session_bootstrapped") &&
      !happyCaptureSource.includes("Network.setExtraHTTPHeaders") &&
      happyCaptureSource.includes("redactE2EArtifact") &&
      artifactRedactionSource.includes("REDACTED"),
  },
  {
    name: "CI runtime and artifact upload",
    pass:
      workflowSource.includes("capture:phase6-e2e-negative") &&
      workflowSource.includes("capture:phase6-e2e-happy") &&
      workflowSource.includes("actions/upload-artifact") &&
      workflowSource.includes("output/ui-evidence"),
  },
];

const failures = contracts.filter((contract) => !contract.pass);

console.log("Phase 6 E2E contract check");
console.log(`Contracts checked: ${contracts.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure.name}`);
  process.exit(1);
}

console.log("\nPASS");
console.log("- guest, fail-closed, portable Chrome, protected fixture, happy path, and artifact contracts passed");
