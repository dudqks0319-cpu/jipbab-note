import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync("scripts/verify-goal-completion.mjs", "utf8");

test("goal completion check reads direct real-device and store evidence files", () => {
  assert.match(source, /docs\/real-device-qa\.md/);
  assert.match(source, /docs\/store-console-confirmation\.md/);
  assert.match(source, /readOptional\(realDeviceQaPath\)/);
  assert.match(source, /readOptional\(storeConsolePath\)/);
});

test("goal completion check requires platform-specific real-device QA evidence", () => {
  assert.match(source, /iOS real-device QA: confirmed/);
  assert.match(source, /Android real-device QA: confirmed/);
  assert.match(source, /iOS core loop: confirmed/);
  assert.match(source, /Android core loop: confirmed/);
  assert.match(source, /iOS Apple login: confirmed/);
  assert.match(source, /Android Apple login\/provider behavior: confirmed/);
  assert.match(source, /iOS local notification permission and scheduling: confirmed/);
  assert.match(source, /Android local notification permission and scheduling: confirmed/);
  assert.match(source, /iOS raw error disclosure: not observed/);
  assert.match(source, /Android raw error disclosure: not observed/);
  assert.match(source, /iOS evidence date: YYYY-MM-DD/);
  assert.match(source, /Android evidence date: YYYY-MM-DD/);
  assert.match(source, /iOS evidence artifacts/);
  assert.match(source, /Android evidence artifacts/);
});

test("goal completion check requires store console confirmation evidence", () => {
  assert.match(source, /App Store Connect\/TestFlight: confirmed/);
  assert.match(source, /TestFlight processing: confirmed/);
  assert.match(source, /Internal tester availability: confirmed/);
  assert.match(source, /Play Console internal testing: confirmed/);
  assert.match(source, /AAB upload: confirmed/);
  assert.match(source, /Internal testing track: confirmed/);
  assert.match(source, /App Store Connect evidence date: YYYY-MM-DD/);
  assert.match(source, /App Store Connect evidence artifacts/);
  assert.match(source, /Play Console evidence date: YYYY-MM-DD/);
  assert.match(source, /Play Console evidence artifacts/);
  assert.match(source, /existing local path or URL/);
  assert.match(source, /existsSync\(artifactPath\)/);
});

test("goal completion check requires both production family and account-deletion smokes", () => {
  assert.match(source, /vercelProductionPass/);
  assert.match(source, /check:vercel-production-env`: pass/);
  assert.match(source, /Production family route smoke: pass/);
  assert.match(source, /check:production-account-deletion-route`: pass/);
  assert.match(source, /Production account-deletion smoke: blocked safely/);
});

test("goal completion check requires release security gate evidence", () => {
  assert.match(source, /보안 릴리즈 게이트/);
  assert.match(source, /`pnpm release:security-check`: pass/);
  assert.match(source, /production dependency audit/);
  assert.match(source, /secret file ignore rules/);
  assert.match(source, /tracked secret files/);
});
