import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = Number(process.env.PUBLICATION_TEST_PORT ?? 4317);
const origin = `http://127.0.0.1:${port}`;
const startupTimeoutMs = 60_000;
const child = spawn(
  "pnpm",
  ["exec", "next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    serverOutput = `${serverOutput}${chunk}`.slice(-8_000);
  });
}

const waitForServer = async () => {
  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js dev server exited before startup.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${origin}/api/recipes?size=1`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Next.js dev server did not start within ${startupTimeoutMs}ms.\n${serverOutput}`);
};

const stopServer = async () => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
};

try {
  await waitForServer();

  const apiResponse = await fetch(`${origin}/api/recipes?size=100&includeCounts=1`);
  assert.equal(apiResponse.status, 200);
  const payload = await apiResponse.json();
  assert.ok(Array.isArray(payload.recipes));
  assert.ok(
    payload.recipes.every(
      (recipe) =>
        recipe.publicationEvidence?.reviewStatus === "approved" &&
        recipe.publicationEvidence?.actualCookingTested === true &&
        recipe.publicationEvidence?.foodSafetyReviewed === true &&
        recipe.publicationEvidence?.sourceRecorded === true,
    ),
  );

  const detailResponse = await fetch(`${origin}/recipe/curated-egg-drop-soup`);
  assert.equal(detailResponse.status, 200);
  const detailHtml = await detailResponse.text();
  assert.match(detailHtml, /이 레시피는 현재 검수 중이에요/);
  assert.doesNotMatch(detailHtml, /재료를 깨끗하게 손질하고 필요한 양을 준비합니다/);

  const familyResponse = await fetch(`${origin}/api/family-groups`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-id": "forged-device" },
    body: JSON.stringify({
      action: "create",
      groupId: "b16918cb-3f36-4dbc-9d4a-01de3ce7d523",
      groupName: "security test",
      inviteCode: "ABCD1234",
      displayName: "tester",
    }),
  });
  assert.equal(familyResponse.status, 401);
  assert.match(familyResponse.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await familyResponse.json(), { message: "로그인이 필요합니다." });

  const mergeResponse = await fetch(`${origin}/api/auth/merge-anonymous`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ anonymousAccessToken: "invalid-anonymous-test-token" }),
  });
  assert.equal(mergeResponse.status, 401);
  assert.match(mergeResponse.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await mergeResponse.json(), { message: "일반 계정 로그인이 필요합니다." });

  console.log(
    `publication and signed-session integration passed: ${payload.recipes.length} approved recipe(s) exposed`,
  );
} finally {
  await stopServer();
}
