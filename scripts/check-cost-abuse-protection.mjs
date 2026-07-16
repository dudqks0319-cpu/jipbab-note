// 사용량 기반 비용이 발생하는 경로의 출시 보호 계약을 정적으로 검증합니다.
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const productRoute = read("app/api/products/route.ts");
const barcodePage = read("app/barcode/page.tsx");
const distributedLimiter = read("lib/distributed-rate-limit.ts");
const boundedOperation = read("lib/cost-bounded-operation.ts");
const recipeList = read("app/api/v1/recipes/route.ts");
const recipeDetail = read("app/api/v1/recipes/[id]/route.ts");
const recommendations = read("app/api/v1/recommendations/route.ts");
const recipeClient = read("lib/recipe-api-v1-client.ts");
const envExample = read(".env.example");
const releaseFlags = read("lib/release-flags.ts");

const checks = [
  ["server-auth-before-provider", /getAuthenticatedServerUser[\s\S]*runCostBoundedOperation/.test(productRoute)],
  ["signed-client-session", /ensureSignedSupabaseUser[\s\S]*Authorization: `Bearer/.test(barcodePage)],
  ["product-multi-dimensional-quota", /dailyLimit: 200[\s\S]*globalDailyLimit: 2_000/.test(productRoute)],
  ["product-user-quota", /products:lookup:user:daily[\s\S]*86_400/.test(productRoute)],
  ["product-timeout", /timeoutMs: 4_000/.test(productRoute)],
  ["product-concurrency", /maxConcurrent: 4/.test(productRoute)],
  ["product-circuit-breaker", /failureThreshold: 5[\s\S]*cooldownMs: 60_000/.test(productRoute)],
  ["provider-response-size", /MAX_PROVIDER_RESPONSE_BYTES/.test(productRoute)],
  ["provider-no-retry", !/\bretry\s*:/i.test(productRoute)],
  ["provider-safe-cache", /revalidate: 86_400/.test(productRoute)],
  ["production-fail-closed", /production[\s\S]*status: "unavailable"/.test(distributedLimiter)],
  ["raw-identities-hmac-only", /createHmac\("sha256"/.test(distributedLimiter)],
  ["timeout-cancellation", /AbortController[\s\S]*Promise\.race/.test(boundedOperation)],
  ["redacted-cost-telemetry", /logTelemetry/.test(boundedOperation)],
  ["recipe-list-global-daily", /dailyLimit: 2_000[\s\S]*globalDailyLimit: 50_000/.test(recipeList)],
  ["recipe-detail-global-daily", /dailyLimit: 4_000[\s\S]*globalDailyLimit: 100_000/.test(recipeDetail)],
  ["recommendation-global-daily", /dailyLimit: 500[\s\S]*globalDailyLimit: 10_000/.test(recommendations)],
  ["recipe-device-quota-key", /getRateLimitHeaders[\s\S]*"x-device-id"/.test(recipeClient)],
  ["community-default-kill-switch", /NEXT_PUBLIC_COMMUNITY_ENABLED=false/.test(envExample)],
  ["community-server-default-off", /NEXT_PUBLIC_COMMUNITY_ENABLED === "true"/.test(releaseFlags)],
  ["hmac-secret-server-only", /API_RATE_LIMIT_HMAC_SECRET=/.test(envExample) && !/NEXT_PUBLIC_API_RATE_LIMIT_HMAC_SECRET/.test(envExample)],
  ["operational-header", /"X-Cost-Guard": "active"/.test(productRoute)],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
console.log("Cost abuse protection contract");
console.log(`Passes: ${checks.length - failures.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS");
for (const [name] of checks) console.log(`- ${name}`);
