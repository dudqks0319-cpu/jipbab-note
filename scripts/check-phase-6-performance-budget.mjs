// 이 파일은 Phase 6 모바일 성능 예산 실행기가 계획서 기준과 출시 게이트에 연결됐는지 검사합니다.
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const captureSource = readFileSync("scripts/capture-phase-6-performance.mjs", "utf8");
const statisticsSource = readFileSync("scripts/lib/performance-statistics.mjs", "utf8");
const vercelBypassSource = readFileSync("scripts/lib/vercel-protection-bypass.mjs", "utf8");
const promotionSource = readFileSync("scripts/promote-phase-6-performance-baseline.mjs", "utf8");
const localGate = readFileSync("scripts/run-release-gates.mjs", "utf8");
const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");
const baseline = JSON.parse(readFileSync("docs/phase-6-performance-baseline.json", "utf8"));

const contracts = [
  {
    name: "runtime capture command",
    pass:
      packageJson.scripts?.["capture:phase6-performance"] ===
      "node scripts/capture-phase-6-performance.mjs",
  },
  {
    name: "explicit production-like target",
    pass:
      captureSource.includes("PHASE6_PERFORMANCE_URL is required") &&
      captureSource.includes("not a development server"),
  },
  {
    name: "mobile device and network profile",
    pass:
      captureSource.includes("width: 390") &&
      captureSource.includes("height: 844") &&
      captureSource.includes("cpuSlowdownMultiplier: 4") &&
      captureSource.includes("downloadBitsPerSecond: 1_600_000") &&
      captureSource.includes("latencyMilliseconds: 150"),
  },
  {
    name: "core web vital observers",
    pass:
      captureSource.includes("largest-contentful-paint") &&
      captureSource.includes("layout-shift") &&
      captureSource.includes("observe('event'") &&
      captureSource.includes("interactionId"),
  },
  {
    name: "plan performance budgets",
    pass:
      captureSource.includes("lcpMilliseconds: 2_500") &&
      captureSource.includes("cls: 0.1") &&
      captureSource.includes("inpMilliseconds: 200") &&
      captureSource.includes("searchInputMilliseconds: 100") &&
      captureSource.includes("ttfbMilliseconds: 800") &&
      captureSource.includes("totalTransferIncreaseRatio: 0.15") &&
      captureSource.includes("jsTransferIncreaseRatio: 0.1") &&
      captureSource.includes("imageTransferIncreaseRatio: 0.15") &&
      captureSource.includes("requestCountIncreaseRatio: 0.15") &&
      captureSource.includes("totalLongTaskIncreaseRatio: 0.15"),
  },
  {
    name: "repeatable p75 sampling",
    pass:
      captureSource.includes("PHASE6_PERFORMANCE_RUNS ?? 3") &&
      captureSource.includes("runCount < 3") &&
      captureSource.includes("percentile(") &&
      captureSource.includes("0.75"),
  },
  {
    name: "cold cache isolation",
    pass:
      captureSource.includes("Network.setCacheDisabled") &&
      captureSource.includes("Network.clearBrowserCache") &&
      captureSource.includes("/json/new"),
  },
  {
    name: "release-candidate cold and warm statistics",
    pass:
      captureSource.includes("requires at least five cold and warm runs") &&
      captureSource.includes('cacheMode === "cold"') &&
      captureSource.includes('"warm-prime"') &&
      captureSource.includes("runCountPerCacheMode") &&
      captureSource.includes("failureRate") &&
      statisticsSource.includes("median") &&
      statisticsSource.includes("standardDeviation"),
  },
  {
    name: "origin-scoped Vercel automation bypass",
    pass:
      captureSource.includes("VERCEL_AUTOMATION_BYPASS_SECRET") &&
      captureSource.includes('client.on("Fetch.requestPaused"') &&
      captureSource.includes('client.send("Fetch.enable"') &&
      !captureSource.includes("Network.setExtraHTTPHeaders") &&
      vercelBypassSource.includes('.endsWith(".vercel.app")') &&
      vercelBypassSource.includes('"x-vercel-protection-bypass"') &&
      vercelBypassSource.includes('"x-vercel-set-bypass-cookie"'),
  },
  {
    name: "trusted search interaction",
    pass:
      captureSource.includes("Input.dispatchMouseEvent") &&
      captureSource.includes("Input.dispatchKeyEvent") &&
      captureSource.includes("searchInputLatency"),
  },
  {
    name: "evidence distinguishes lab and field p75",
    pass:
      captureSource.includes("repeatable_mobile_lab_guard_not_field_p75") &&
      captureSource.includes("production field p75 remains a separate requirement"),
  },
  {
    name: "runtime failure classification",
    pass:
      captureSource.includes("expectedDependencyFailures") &&
      captureSource.includes("expectedPlatformFailures") &&
      captureSource.includes("unexpectedNetworkErrorCount") &&
      captureSource.includes('requestUrl.startsWith("https://vercel.live/")'),
  },
  {
    name: "resource, long task, and hydration regression evidence",
    pass:
      captureSource.includes("jsTransferP75Bytes") &&
      captureSource.includes("imageTransferP75Bytes") &&
      captureSource.includes("requestCountP75") &&
      captureSource.includes("longTaskOver50P75Count") &&
      captureSource.includes("hydrationErrorCount") &&
      captureSource.includes("missingBaselines") &&
      baseline.schemaVersion === 1,
  },
  {
    name: "populated release-candidate surfaces",
    pass:
      captureSource.includes('PHASE6_PERFORMANCE_PROFILE must be baseline or release-candidate') &&
      captureSource.includes('published-recipe-list-12') &&
      captureSource.includes('minimumSelectorCount: 12') &&
      captureSource.includes('image-recipe-detail-serving') &&
      captureSource.includes('shopping-list-20') &&
      captureSource.includes('minimumSelectorCount: 20') &&
      captureSource.includes('cooking-mode') &&
      captureSource.includes('timer-running') &&
      captureSource.includes('family-fridge') &&
      captureSource.includes('login-callback') &&
      captureSource.includes('app-info') &&
      captureSource.includes('release-candidate regression baselines are missing'),
  },
  {
    name: "reviewed release-candidate baseline promotion",
    pass:
      packageJson.scripts?.["promote:phase6-performance-baseline"] ===
        "node scripts/promote-phase-6-performance-baseline.mjs" &&
      captureSource.includes("PHASE6_PERFORMANCE_DEPLOYMENT_SHA must be a full Git SHA") &&
      captureSource.includes('deploymentSha: measurementProfile === "release-candidate"') &&
      promotionSource.includes("PHASE6_PERFORMANCE_PROMOTION_APPROVED=1") &&
      promotionSource.includes("release-candidate regression baselines are missing:") &&
      promotionSource.includes("must not contain absolute performance or runtime failures") &&
      promotionSource.includes("five successful cold and warm runs") &&
      promotionSource.includes("requiredReleaseCandidateRoutes"),
  },
  {
    name: "local and CI release gate wiring",
    pass:
      localGate.includes("scripts/check-phase-6-performance-budget.mjs") &&
      ciGate.includes("scripts/check-phase-6-performance-budget.mjs"),
  },
];

const failures = contracts.filter((contract) => !contract.pass);

console.log("Phase 6 performance budget contract check");
console.log(`Contracts checked: ${contracts.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure.name}`);
  process.exit(1);
}

console.log("\nPASS");
console.log("- mobile lab profile, absolute and regression budgets, failure classification, interaction timing, and release wiring passed");
