// 이 파일은 승인 레시피가 0개인 현재 상태에서 게스트 첫 사용과 fail-closed 보안 경로를 실제 Chrome으로 검증합니다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveChromeExecutable } from "./lib/chrome-path.mjs";

const requestedUrl = process.env.PHASE6_E2E_URL?.trim() || null;
const port = Number(process.env.PHASE6_E2E_PORT ?? 4328);
const origin = requestedUrl ? new URL(requestedUrl).origin : `http://127.0.0.1:${port}`;
const chromePath = resolveChromeExecutable();
const evidenceDir = path.resolve("output/ui-evidence");
const screenshotPath = path.join(evidenceDir, "phase6-e2e-guest-negative-390.png");
const fullHappyPathStatus = "technical_fixture_available_staging_database_pending";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let server = null;
let serverOutput = "";

if (!requestedUrl) {
  server = spawn(
    "pnpm",
    ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const stream of [server.stdout, server.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      serverOutput = `${serverOutput}${chunk}`.slice(-10_000);
    });
  }
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server && server.exitCode !== null) {
      throw new Error(`Next.js server exited before startup.\n${serverOutput}`);
    }
    try {
      const response = await fetch(`${origin}/`);
      if (response.ok) return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`Next.js server did not start within 60 seconds.\n${serverOutput}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    sleep(3_000),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

mkdirSync(evidenceDir, { recursive: true });
const userDataDir = mkdtempSync(path.join(os.tmpdir(), "jipbab-phase6-e2e-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitForDevToolsPort() {
  const portFile = path.join(userDataDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (chrome.exitCode !== null) {
      throw new Error(`Chrome exited before DevTools became ready (exit ${chrome.exitCode})`);
    }
    if (existsSync(portFile)) {
      const [debugPort] = readFileSync(portFile, "utf8").trim().split("\n");
      if (debugPort) return Number(debugPort);
    }
    await sleep(100);
  }
  throw new Error("Chrome DevTools port did not become ready within 30 seconds");
}

function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const events = new Map();
  let nextId = 1;
  const opened = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (!handler) return;
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
      return;
    }
    const listeners = events.get(message.method) ?? [];
    events.delete(message.method);
    for (const listener of listeners) listener.resolve(message.params);
  });

  return {
    opened,
    async send(method, params = {}) {
      await opened;
      const id = nextId;
      nextId += 1;
      const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
      socket.send(JSON.stringify({ id, method, params }));
      return result;
    },
    waitFor(method, timeoutMs = 15_000) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`${method} timed out`)), timeoutMs);
        const listener = {
          resolve(value) {
            clearTimeout(timeout);
            resolve(value);
          },
        };
        events.set(method, [...(events.get(method) ?? []), listener]);
      });
    },
    close() {
      socket.close();
    },
  };
}

function expressionFor(functionBody, args = []) {
  return `(${functionBody})(...${JSON.stringify(args)})`;
}

async function evaluate(client, functionBody, args = []) {
  const result = await client.send("Runtime.evaluate", {
    expression: expressionFor(functionBody, args),
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  }
  return result.result.value;
}

async function waitForBrowserCondition(client, label, functionBody, args = [], timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(client, functionBody, args)) return;
    await sleep(150);
  }
  const state = await evaluate(
    client,
    `() => ({
      href: window.location.href,
      body: document.body?.innerText.slice(0, 2400) ?? '',
    })`,
  );
  throw new Error(`Browser condition timed out: ${label}\n${JSON.stringify(state, null, 2)}`);
}

async function navigate(client, url) {
  const loaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.navigate", { url });
  await loaded;
  await sleep(500);
}

const bodyIncludes = `(text) => document.body?.innerText.includes(text) ?? false`;
const bodyIncludesAny = `(texts) => texts.some((text) => document.body?.innerText.includes(text) ?? false)`;
const clickTestId = `(testId) => {
  const target = document.querySelector('[data-testid="' + testId + '"]');
  if (!(target instanceof HTMLElement)) return false;
  target.click();
  return true;
}`;
const apiResources = `() => performance.getEntriesByType('resource')
  .map((entry) => entry.name)
  .filter((name) => name.includes('/api/v1/'))`;

const checks = [];
let client = null;

try {
  await waitForServer();
  const debugPort = await waitForDevToolsPort();
  const targetResponse = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  assert.equal(targetResponse.ok, true, `Chrome target creation failed: ${targetResponse.status}`);
  const target = await targetResponse.json();
  client = createClient(target.webSocketDebuggerUrl);
  await client.opened;
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });

  await navigate(client, `${origin}/`);
  await waitForBrowserCondition(client, "fresh guest starter", bodyIncludes, ["있는 재료만 골라주세요"]);
  checks.push("fresh_guest_starter_visible");

  assert.equal(await evaluate(client, clickTestId, ["starter-ingredient-계란"]), true);
  assert.equal(await evaluate(client, clickTestId, ["starter-ingredient-두부"]), true);
  await waitForBrowserCondition(client, "two selected ingredients", bodyIncludes, ["2개 담고 추천 보기"]);
  assert.equal(await evaluate(client, clickTestId, ["starter-submit"]), true);
  await waitForBrowserCondition(client, "two ingredients persisted", bodyIncludes, ["보관 2개"]);
  await waitForBrowserCondition(
    client,
    "publication gate visible",
    bodyIncludesAny,
    [["레시피 서비스를 점검하고 있습니다.", "현재 공개 가능한 레시피를 준비 중이에요."]],
  );
  checks.push("guest_ingredients_saved", "recommendation_fail_closed");

  const reloaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.reload", { ignoreCache: true });
  await reloaded;
  await waitForBrowserCondition(client, "reload persistence", bodyIncludes, ["보관 2개"]);
  checks.push("guest_ingredients_restored_after_reload");

  await navigate(client, `${origin}/recipe?q=${encodeURIComponent("계란")}`);
  await waitForBrowserCondition(
    client,
    "recipe service fail-closed",
    bodyIncludesAny,
    [["레시피 서비스를 점검하고 있습니다.", "레시피를 불러오지 못했습니다."]],
  );
  assert.equal(
    await evaluate(client, `() => document.querySelector('input[placeholder="레시피 검색"]')?.value`, []),
    "계란",
  );
  checks.push("recipe_search_url_restored", "recipe_list_fail_closed");

  await navigate(client, `${origin}/recipe/not-a-uuid`);
  await waitForBrowserCondition(
    client,
    "unapproved detail fail-closed",
    bodyIncludes,
    ["출처, 안전 안내와 실제 조리를 확인한 레시피만 공개합니다."],
  );
  checks.push("recipe_detail_fail_closed");

  await navigate(client, `${origin}/?demo=appstore`);
  await sleep(2_000);
  assert.deepEqual(await evaluate(client, apiResources), []);
  await navigate(client, `${origin}/recipe?demo=appstore`);
  await sleep(2_000);
  assert.deepEqual(await evaluate(client, apiResources), []);
  checks.push("demo_home_no_recipe_api", "demo_list_no_recipe_api");

  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const familyResponse = await fetch(`${origin}/api/family-groups`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-id": "forged-e2e-device" },
    body: JSON.stringify({
      action: "create",
      groupId: "b16918cb-3f36-4dbc-9d4a-01de3ce7d523",
      groupName: "e2e security",
      inviteCode: "ABCD1234",
      displayName: "tester",
    }),
  });
  assert.equal(familyResponse.status, 503);
  assert.match(familyResponse.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(familyResponse.headers.get("retry-after"), null);

  const mergeResponse = await fetch(`${origin}/api/auth/merge-anonymous`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ anonymousAccessToken: "invalid-e2e-token" }),
  });
  assert.equal(mergeResponse.status, 401);
  assert.match(mergeResponse.headers.get("cache-control") ?? "", /no-store/);

  const deleteResponse = await fetch(`${origin}/api/account/delete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "WRONG_CONFIRMATION" }),
  });
  assert.equal(deleteResponse.status, 400);
  assert.match(deleteResponse.headers.get("cache-control") ?? "", /no-store/);
  checks.push("family_dependency_fail_closed", "merge_auth_rejected", "account_delete_input_rejected");
} finally {
  if (client) {
    try {
      await client.send("Page.close");
    } catch {
      // 이미 닫힌 Chrome target은 추가 정리가 필요하지 않습니다.
    }
    client.close();
  }
  chrome.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => chrome.once("exit", resolve)),
    sleep(2_000),
  ]);
  if (chrome.exitCode === null) {
    chrome.kill("SIGKILL");
    await sleep(200);
  }
  rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await stopServer();
}

console.log("Phase 6 E2E negative-path capture");
console.log(`Origin: ${origin}`);
console.log(`Checks passed: ${checks.length}`);
for (const check of checks) console.log(`- ${check}`);
console.log(`Screenshot: ${screenshotPath}`);
console.log(`Full happy-path status: ${fullHappyPathStatus}`);
console.log("\nPASS");
console.log("- current guest and fail-closed paths passed without claiming the blocked published-recipe flow");
