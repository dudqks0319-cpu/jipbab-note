// 이 파일은 격리된 기술 fixture로 추천부터 조리 완료까지 Phase 6 전체 성공 경로를 실제 Chrome에서 검증합니다.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
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
const port = Number(process.env.PHASE6_E2E_PORT ?? 4329);
const origin = requestedUrl ? new URL(requestedUrl).origin : `http://127.0.0.1:${port}`;
const fixtureToken = process.env.PHASE6_E2E_FIXTURE_TOKEN?.trim()
  || (requestedUrl ? null : "phase6-local-e2e-fixture-token");
const fixtureRecipeId = "00000000-0000-4000-8000-0000000006e1";
const chromePath = resolveChromeExecutable();
const evidenceDir = path.resolve("output/ui-evidence");
const artifactPaths = {
  mobile: path.join(evidenceDir, "phase6-e2e-mobile-390.png"),
  desktop: path.join(evidenceDir, "phase6-e2e-desktop-1280.png"),
  network: path.join(evidenceDir, "phase6-network-log.json"),
  console: path.join(evidenceDir, "phase6-console-log.json"),
  result: path.join(evidenceDir, "phase6-e2e-result.json"),
  accessibility: path.join(evidenceDir, "phase6-accessibility-summary.json"),
};

if (!fixtureToken) {
  throw new Error("외부 Preview happy-path 검증에는 PHASE6_E2E_FIXTURE_TOKEN이 필요합니다.");
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let server = null;
let serverOutput = "";

if (!requestedUrl) {
  server = spawn(
    "pnpm",
    ["exec", "next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_ENV: "staging",
        PHASE6_E2E_FIXTURE_ENABLED: "true",
        PHASE6_E2E_FIXTURE_TOKEN: fixtureToken,
        NEXT_PUBLIC_API_BASE_URL: "",
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const stream of [server.stdout, server.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      serverOutput = `${serverOutput}${chunk}`.slice(-12_000);
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

function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const waiters = new Map();
  const listeners = new Map();
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
    for (const listener of listeners.get(message.method) ?? []) {
      listener(message.params);
    }
    const methodWaiters = waiters.get(message.method) ?? [];
    const waiter = methodWaiters.shift();
    if (waiter) {
      clearTimeout(waiter.timeout);
      waiter.resolve(message.params);
      waiters.set(message.method, methodWaiters);
    }
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
    on(method, listener) {
      listeners.set(method, [...(listeners.get(method) ?? []), listener]);
    },
    waitFor(method, timeoutMs = 15_000) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`${method} timed out`)), timeoutMs);
        waiters.set(method, [...(waiters.get(method) ?? []), { resolve, timeout }]);
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
  const state = await evaluate(client, `() => ({ href: location.href, body: document.body?.innerText.slice(0, 3000) ?? '' })`);
  throw new Error(`Browser condition timed out: ${label}\n${JSON.stringify(state, null, 2)}`);
}

async function navigate(client, url) {
  const loaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.navigate", { url });
  await loaded;
  await sleep(350);
}

async function reload(client) {
  const loaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.reload", { ignoreCache: true });
  await loaded;
  await sleep(350);
}

async function captureScreenshot(client, outputPath) {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  writeFileSync(outputPath, Buffer.from(screenshot.data, "base64"));
}

const bodyIncludes = `(text) => document.body?.innerText.includes(text) ?? false`;
const testIdIncludes = `(testId, text) => document.querySelector('[data-testid="' + testId + '"]')?.textContent?.includes(text) ?? false`;
const clickTestId = `(testId) => {
  const target = document.querySelector('[data-testid="' + testId + '"]');
  if (!(target instanceof HTMLElement)) return false;
  target.click();
  return true;
}`;
const fillTestId = `(testId, value) => {
  const target = document.querySelector('[data-testid="' + testId + '"]');
  if (!(target instanceof HTMLInputElement)) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) return false;
  setter.call(target, value);
  target.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}`;

mkdirSync(evidenceDir, { recursive: true });
const checks = [];
const networkLog = [];
const consoleLog = [];
const requestDetails = new Map();
let accessibilitySummary = null;
let failure = null;
let client = null;

function summarizeRuntimeDiagnostics() {
  const failedRequests = networkLog.filter((entry) => entry.type === "failed");
  return {
    consoleErrorCount: consoleLog.filter((entry) => entry.type === "error").length,
    failedRequestCount: failedRequests.length,
    appFailedRequestCount: failedRequests.filter((entry) => (
      typeof entry.url === "string" && entry.url.startsWith(origin) && !entry.canceled
    )).length,
    canceledAppRequestCount: failedRequests.filter((entry) => (
      typeof entry.url === "string" && entry.url.startsWith(origin) && entry.canceled
    )).length,
    externalFailedRequestCount: failedRequests.filter((entry) => (
      typeof entry.url === "string" && !entry.url.startsWith(origin)
    )).length,
    httpErrorResponseCount: networkLog.filter((entry) => (
      entry.type === "response" && typeof entry.status === "number" && entry.status >= 400
    )).length,
  };
}

const userDataDir = mkdtempSync(path.join(os.tmpdir(), "jipbab-phase6-happy-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  await waitForServer();
  const portFile = path.join(userDataDir, "DevToolsActivePort");
  let debugPort = null;
  for (let attempt = 0; attempt < 100 && !debugPort; attempt += 1) {
    try {
      debugPort = Number(readFileSync(portFile, "utf8").trim().split("\n")[0]);
    } catch {
      await sleep(100);
    }
  }
  assert.ok(debugPort, "Chrome DevTools port did not become ready");
  const targetResponse = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  assert.equal(targetResponse.ok, true);
  const target = await targetResponse.json();
  client = createClient(target.webSocketDebuggerUrl);
  await client.opened;
  await Promise.all([
    client.send("Page.enable"),
    client.send("Runtime.enable"),
    client.send("Network.enable"),
  ]);
  client.on("Runtime.consoleAPICalled", (event) => {
    consoleLog.push({
      type: event.type,
      timestamp: event.timestamp,
      values: event.args.map((argument) => argument.value ?? argument.description ?? ""),
    });
  });
  client.on("Network.requestWillBeSent", (event) => {
    requestDetails.set(event.requestId, {
      method: event.request.method,
      url: event.request.url,
      resourceType: event.type,
    });
  });
  client.on("Network.responseReceived", (event) => {
    if (event.response.url.startsWith(origin)) {
      const request = requestDetails.get(event.requestId);
      networkLog.push({
        type: "response",
        method: request?.method ?? "unknown",
        url: event.response.url,
        status: event.response.status,
        mimeType: event.response.mimeType,
      });
    }
  });
  client.on("Network.loadingFailed", (event) => {
    const request = requestDetails.get(event.requestId);
    networkLog.push({
      type: "failed",
      requestId: event.requestId,
      method: request?.method ?? "unknown",
      url: request?.url ?? null,
      resourceType: request?.resourceType ?? event.type,
      canceled: event.canceled ?? false,
      errorText: event.errorText,
    });
  });
  await client.send("Network.setExtraHTTPHeaders", {
    headers: { "x-phase6-e2e-fixture": fixtureToken },
  });
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
  assert.equal(await evaluate(client, clickTestId, ["starter-ingredient-계란"]), true);
  assert.equal(await evaluate(client, clickTestId, ["starter-ingredient-두부"]), true);
  assert.equal(await evaluate(client, clickTestId, ["starter-submit"]), true);
  await waitForBrowserCondition(client, "fixture recommendation", bodyIncludes, ["계란 두부 한 팬"]);
  checks.push("fresh_guest_saved", "recommendation_result_visible");

  const recommendationApi = await evaluate(client, `async (recipeId) => {
    const response = await fetch('/api/v1/recommendations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ingredientIds: ['dairy-egg', 'dairy-tofu'], maxMissingIngredients: 2, servings: 2, limit: 5 }),
    });
    const payload = await response.json();
    return {
      status: response.status,
      id: payload.data?.recommendations?.[0]?.recipe?.id ?? null,
      isTestFixture: payload.data?.recommendations?.[0]?.recipe?.isTestFixture ?? false,
      expectedId: recipeId,
    };
  }`, [fixtureRecipeId]);
  assert.deepEqual(recommendationApi, {
    status: 200,
    id: fixtureRecipeId,
    isTestFixture: true,
    expectedId: fixtureRecipeId,
  });
  checks.push("recommendation_api_200");

  assert.equal(await evaluate(client, clickTestId, ["today-primary-cta"]), true);
  await waitForBrowserCondition(client, "recipe detail", bodyIncludes, ["기술 E2E 전용 레시피"]);
  assert.equal(await evaluate(client, clickTestId, ["recipe-servings-increase"]), true);
  await waitForBrowserCondition(client, "servings scaled", testIdIncludes, ["recipe-servings-value", "3"]);
  checks.push("detail_opened", "servings_scaled");

  await waitForBrowserCondition(client, "one missing ingredient", bodyIncludes, ["필수 부족 재료 1개"]);
  assert.equal(await evaluate(client, clickTestId, ["missing-ingredients-add"]), true);
  await waitForBrowserCondition(client, "shopping add", bodyIncludes, ["내 장보기에 1개를 추가했어요."]);
  checks.push("missing_ingredient_added");

  await navigate(client, `${origin}/shopping`);
  await waitForBrowserCondition(client, "shopping item persisted", bodyIncludes, ["미구매 (1)"]);
  assert.equal(await evaluate(client, fillTestId, ["shopping-quick-input", "파 1단"]), true);
  const duplicateDialogOpening = client.waitFor("Page.javascriptDialogOpening");
  const duplicateSubmitClick = evaluate(client, clickTestId, ["shopping-quick-submit"]);
  await duplicateDialogOpening;
  await client.send("Page.handleJavaScriptDialog", { accept: true });
  assert.equal(await duplicateSubmitClick, true);
  await waitForBrowserCondition(client, "shopping duplicate merged", bodyIncludes, ["파 수량을 기존 장보기 항목과 합쳤어요."]);
  checks.push("shopping_duplicate_merged");

  await navigate(client, `${origin}/recipe/${fixtureRecipeId}`);
  await waitForBrowserCondition(client, "recipe detail restored", bodyIncludes, ["기술 E2E 전용 레시피"]);

  assert.equal(await evaluate(client, clickTestId, ["recipe-start-cooking"]), true);
  assert.equal(await evaluate(client, clickTestId, ["cook-timer-toggle"]), true);
  await waitForBrowserCondition(client, "30 second timer running", testIdIncludes, ["cook-timer-toggle", "일시정지"]);
  assert.equal(await evaluate(client, clickTestId, ["cook-timer-toggle"]), true);
  await waitForBrowserCondition(client, "timer paused", testIdIncludes, ["cook-timer-toggle", "계속"]);
  await reload(client);
  await waitForBrowserCondition(client, "paused timer restored", testIdIncludes, ["cook-timer-toggle", "계속"]);
  checks.push("cooking_started", "timer_30_paused", "timer_reload_restored");

  assert.equal(await evaluate(client, clickTestId, ["cook-complete-step"]), true);
  assert.equal(await evaluate(client, clickTestId, ["cook-next-step"]), true);
  assert.equal(await evaluate(client, clickTestId, ["cook-timer-toggle"]), true);
  await waitForBrowserCondition(client, "90 second timer running", testIdIncludes, ["cook-timer-toggle", "1:30"]);
  assert.equal(await evaluate(client, clickTestId, ["cook-timer-toggle"]), true);
  await waitForBrowserCondition(client, "90 second timer paused", testIdIncludes, ["cook-timer-toggle", "계속"]);
  assert.equal(await evaluate(client, clickTestId, ["cook-previous-step"]), true);
  assert.equal(await evaluate(client, clickTestId, ["cook-next-step"]), true);
  assert.equal(await evaluate(client, clickTestId, ["cook-complete-step"]), true);
  assert.equal(await evaluate(client, clickTestId, ["cook-next-step"]), true);
  assert.equal(await evaluate(client, clickTestId, ["cook-complete-step"]), true);
  await waitForBrowserCondition(client, "cooking complete", bodyIncludes, ["조리 완료"]);
  assert.equal(await evaluate(client, clickTestId, ["cook-feedback-easy"]), true);
  checks.push("timer_90_paused", "previous_step", "cooking_completed", "feedback_saved");

  const dialogOpening = client.waitFor("Page.javascriptDialogOpening");
  const consumeClick = evaluate(client, clickTestId, ["consumed-ingredients-apply"]);
  await dialogOpening;
  await client.send("Page.handleJavaScriptDialog", { accept: true });
  assert.equal(await consumeClick, true);
  await waitForBrowserCondition(client, "ingredients consumed", bodyIncludes, ["사용한 재료 2개를 소진 처리했어요."]);
  await reload(client);
  await waitForBrowserCondition(client, "completion restored", bodyIncludes, ["조리 완료"]);
  assert.equal(
    await evaluate(client, `(testId) => document.querySelector('[data-testid="' + testId + '"]')?.getAttribute('aria-pressed')`, ["cook-feedback-easy"]),
    "true",
  );
  checks.push("ingredients_consumed", "completion_restored");

  accessibilitySummary = await evaluate(client, `() => {
    const controls = [...document.querySelectorAll('button, a, input, select')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          testId: element.getAttribute('data-testid'),
          label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 80) || '',
        };
      });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      visibleControlCount: controls.length,
      undersizedControlCount: controls.filter((control) => control.width < 44 || control.height < 44).length,
      undersizedControls: controls.filter((control) => control.width < 44 || control.height < 44),
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    };
  }`);
  assert.equal(accessibilitySummary.horizontalOverflow, 0, "390px 화면에 가로 overflow가 없어야 합니다.");
  assert.equal(accessibilitySummary.undersizedControlCount, 0, "보이는 인터랙션은 44px 이상이어야 합니다.");
  await evaluate(client, `() => {
    document.querySelector('#cook-mode')?.scrollIntoView({ block: 'start' });
    return true;
  }`);
  await sleep(250);
  await captureScreenshot(client, artifactPaths.mobile);
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 1280,
    screenHeight: 900,
  });
  await evaluate(client, `() => {
    document.querySelector('#cook-mode')?.scrollIntoView({ block: 'start' });
    return true;
  }`);
  await sleep(250);
  await captureScreenshot(client, artifactPaths.desktop);
  const runtimeDiagnostics = summarizeRuntimeDiagnostics();
  assert.equal(runtimeDiagnostics.consoleErrorCount, 0, "브라우저 console error가 없어야 합니다.");
  assert.equal(runtimeDiagnostics.appFailedRequestCount, 0, "취소되지 않은 앱 내부 요청 실패가 없어야 합니다.");
  assert.equal(runtimeDiagnostics.httpErrorResponseCount, 0, "앱 HTTP 4xx/5xx 응답이 없어야 합니다.");
  checks.push("mobile_accessibility_44px", "mobile_desktop_artifacts_captured");
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
} finally {
  writeFileSync(artifactPaths.network, `${JSON.stringify(networkLog, null, 2)}\n`);
  writeFileSync(artifactPaths.console, `${JSON.stringify(consoleLog, null, 2)}\n`);
  writeFileSync(artifactPaths.accessibility, `${JSON.stringify(accessibilitySummary, null, 2)}\n`);
  writeFileSync(artifactPaths.result, `${JSON.stringify({
    status: failure ? "FAIL" : "PASS",
    origin,
    fixtureRecipeId,
    isTestFixture: true,
    humanReviewCounted: false,
    checks,
    ...summarizeRuntimeDiagnostics(),
    error: failure?.message ?? null,
  }, null, 2)}\n`);
  if (client) {
    try {
      await client.send("Page.close");
    } catch {
      // 이미 닫힌 Chrome target은 추가 정리가 필요하지 않습니다.
    }
    client.close();
  }
  chrome.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => chrome.once("exit", resolve)), sleep(2_000)]);
  if (chrome.exitCode === null) chrome.kill("SIGKILL");
  rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await stopServer();
}

if (failure) throw failure;

console.log("Phase 6 E2E happy-path capture");
console.log(`Origin: ${origin}`);
console.log(`Checks passed: ${checks.length}`);
for (const check of checks) console.log(`- ${check}`);
console.log(`Artifacts: ${evidenceDir}`);
console.log("\nPASS");
console.log("- technical fixture happy path passed without counting it as human review evidence");
