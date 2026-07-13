// 이 파일은 Vercel Preview의 모바일 성능을 Chrome CDP로 반복 측정해 Phase 6 예산을 검증합니다.
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

const requestedUrl = process.env.PHASE6_PERFORMANCE_URL?.trim();
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const runCount = Number(process.env.PHASE6_PERFORMANCE_RUNS ?? 3);
const settleMilliseconds = Number(process.env.PHASE6_PERFORMANCE_SETTLE_MS ?? 4_000);
const measurementProfile = process.env.PHASE6_PERFORMANCE_PROFILE?.trim() || "baseline";
const populatedRecipeId = process.env.PHASE6_PERFORMANCE_RECIPE_ID?.trim() || "";
const populatedRecipeTitle = process.env.PHASE6_PERFORMANCE_RECIPE_TITLE?.trim() || "";
const evidenceDir = path.resolve("output/performance-evidence");
const evidencePath = path.join(evidenceDir, "phase6-performance-lab.json");
const baselinePath = path.resolve("docs/phase-6-performance-baseline.json");

const budgets = Object.freeze({
  lcpMilliseconds: 2_500,
  cls: 0.1,
  inpMilliseconds: 200,
  searchInputMilliseconds: 100,
  ttfbMilliseconds: 800,
  totalTransferIncreaseRatio: 0.15,
  jsTransferIncreaseRatio: 0.1,
  imageTransferIncreaseRatio: 0.15,
  requestCountIncreaseRatio: 0.15,
  totalLongTaskIncreaseRatio: 0.15,
  longTaskThresholdMilliseconds: 50,
});

const regressionBaseline = JSON.parse(readFileSync(baselinePath, "utf8"));

const device = Object.freeze({
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  cpuSlowdownMultiplier: 4,
  latencyMilliseconds: 150,
  downloadBitsPerSecond: 1_600_000,
  uploadBitsPerSecond: 750_000,
});

const baselineRoutes = [
  {
    name: "guest-home",
    path: "/",
    expectedText: "있는 재료만 골라주세요",
  },
  {
    name: "demo-recipe-list",
    path: "/recipe?demo=appstore",
    expectedText: "총 0개 레시피",
    interaction: "recipe-search",
  },
  {
    name: "demo-shopping",
    path: "/shopping?demo=appstore",
    expectedText: "장보기",
  },
];

const releaseCandidateRoutes = [
  {
    name: "published-home",
    path: "/",
    expectedText: "오늘 바로 가능한 메뉴",
    requiredSelector: '[data-testid="today-primary-cta"]',
    minimumSelectorCount: 1,
  },
  {
    name: "published-recipe-list-12",
    path: "/recipe",
    expectedText: "레시피",
    requiredSelector: '[data-testid="recipe-card"]',
    minimumSelectorCount: 12,
    interaction: "recipe-search",
  },
  {
    name: "image-recipe-detail-serving",
    path: `/recipe/${populatedRecipeId}`,
    expectedText: populatedRecipeTitle,
    requiredSelector: 'img[src]',
    minimumSelectorCount: 1,
    interaction: "servings",
  },
  {
    name: "shopping-list-20",
    path: "/shopping",
    expectedText: "장보기 리스트",
    requiredSelector: '[data-testid="shopping-item-row"]',
    minimumSelectorCount: 20,
  },
  {
    name: "cooking-mode",
    path: `/recipe/${populatedRecipeId}`,
    expectedText: populatedRecipeTitle,
    interaction: "cooking",
  },
  {
    name: "timer-running",
    path: `/recipe/${populatedRecipeId}`,
    expectedText: populatedRecipeTitle,
    interaction: "timer",
  },
  {
    name: "family-fridge",
    path: "/family",
    expectedText: "가족 냉장고",
  },
  {
    name: "login-callback",
    path: "/auth/callback?error=access_denied",
    expectedText: "로그인을 완료하지 못했습니다.",
  },
  {
    name: "app-info",
    path: "/settings/app-info",
    expectedText: "배포본을 직접 확인할 수 있어요",
  },
];

if (!new Set(["baseline", "release-candidate"]).has(measurementProfile)) {
  throw new Error("PHASE6_PERFORMANCE_PROFILE must be baseline or release-candidate");
}

if (measurementProfile === "release-candidate") {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(populatedRecipeId)) {
    throw new Error("PHASE6_PERFORMANCE_RECIPE_ID must be a published recipe UUID for release-candidate capture");
  }
  if (!populatedRecipeTitle || populatedRecipeTitle.length > 100) {
    throw new Error("PHASE6_PERFORMANCE_RECIPE_TITLE is required and must be at most 100 characters");
  }
}

const routes = measurementProfile === "release-candidate" ? releaseCandidateRoutes : baselineRoutes;

if (!requestedUrl) {
  throw new Error(
    "PHASE6_PERFORMANCE_URL is required. Measure a production build or Vercel Preview, not a development server.",
  );
}

if (!Number.isInteger(runCount) || runCount < 3 || runCount > 9) {
  throw new Error("PHASE6_PERFORMANCE_RUNS must be an integer between 3 and 9");
}

if (!Number.isFinite(settleMilliseconds) || settleMilliseconds < 2_000) {
  throw new Error("PHASE6_PERFORMANCE_SETTLE_MS must be at least 2000");
}

if (!existsSync(chromePath)) {
  throw new Error(`Chrome not found: ${chromePath}`);
}

const targetOrigin = new URL(requestedUrl).origin;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const round = (value, digits = 1) => {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
};

function percentile(values, percentileValue) {
  assert.ok(values.length > 0, "percentile requires at least one value");
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1);
  return sorted[index];
}

function safeResourceName(value) {
  try {
    const url = new URL(value);
    return url.origin === targetOrigin ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return "invalid-resource-url";
  }
}

function sanitizeRuntimeMessage(value) {
  return String(value)
    .replace(/https?:\/\/[^\s)]+/g, (url) => safeResourceName(url))
    .slice(0, 500);
}

const observerSource = `(() => {
  const state = {
    cls: 0,
    events: [],
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    longTasks: [],
    searchInputLatency: null,
    unsupported: [],
  };
  Object.defineProperty(window, '__phase6Performance', {
    configurable: false,
    enumerable: false,
    value: state,
    writable: false,
  });

  const observe = (type, callback, options = {}) => {
    try {
      const observer = new PerformanceObserver((list) => callback(list.getEntries()));
      observer.observe({ type, buffered: true, ...options });
    } catch {
      state.unsupported.push(type);
    }
  };

  observe('paint', (entries) => {
    for (const entry of entries) {
      if (entry.name === 'first-contentful-paint') state.firstContentfulPaint = entry.startTime;
    }
  });
  observe('largest-contentful-paint', (entries) => {
    const entry = entries.at(-1);
    if (entry) {
      state.largestContentfulPaint = {
        className: entry.element?.className || null,
        id: entry.element?.id || null,
        size: entry.size,
        startTime: entry.startTime,
        tagName: entry.element?.tagName?.toLowerCase() || null,
        url: entry.url || null,
      };
    }
  });
  observe('layout-shift', (entries) => {
    for (const entry of entries) {
      if (!entry.hadRecentInput) state.cls += entry.value;
    }
  });
  observe('event', (entries) => {
    for (const entry of entries) {
      if (!entry.interactionId) continue;
      state.events.push({
        duration: entry.duration,
        interactionId: entry.interactionId,
        name: entry.name,
        startTime: entry.startTime,
      });
    }
  }, { durationThreshold: 16 });
  observe('longtask', (entries) => {
    for (const entry of entries) {
      state.longTasks.push({ duration: entry.duration, startTime: entry.startTime });
    }
  });
})();`;

function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
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
      return () => {
        listeners.set(
          method,
          (listeners.get(method) ?? []).filter((candidate) => candidate !== listener),
        );
      };
    },
    waitFor(method, timeoutMilliseconds = 30_000) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(`${method} timed out`)),
          timeoutMilliseconds,
        );
        const remove = this.on(method, (params) => {
          clearTimeout(timeout);
          remove();
          resolve(params);
        });
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "Browser evaluation failed");
  }
  return result.result.value;
}

async function waitForPageText(client, expectedText) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const found = await evaluate(
      client,
      `document.body?.innerText.includes(${JSON.stringify(expectedText)}) ?? false`,
    );
    if (found) return;
    await sleep(150);
  }
  const body = await evaluate(client, "document.body?.innerText.slice(0, 2000) ?? ''");
  throw new Error(`Expected app text not found: ${expectedText}\n${body}`);
}

async function trustedClick(client, selector) {
  const rect = await evaluate(
    client,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };
    })()`,
  );
  assert.ok(rect, `Interaction target not found: ${selector}`);
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    clickCount: 1,
    x: rect.x,
    y: rect.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    clickCount: 1,
    x: rect.x,
    y: rect.y,
  });
}

async function exerciseRecipeSearch(client) {
  const selector = 'input[placeholder="레시피 검색"]';
  await trustedClick(client, selector);
  await evaluate(
    client,
    `(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!(input instanceof HTMLInputElement)) throw new Error('recipe search input missing');
      const state = window.__phase6Performance;
      state.searchInputStartedAt = performance.now();
      input.addEventListener('input', () => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          state.searchInputLatency = performance.now() - state.searchInputStartedAt;
        }));
      }, { once: true });
    })()`,
  );
  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    code: "KeyE",
    key: "e",
    text: "e",
    unmodifiedText: "e",
    windowsVirtualKeyCode: 69,
    nativeVirtualKeyCode: 69,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    code: "KeyE",
    key: "e",
    windowsVirtualKeyCode: 69,
    nativeVirtualKeyCode: 69,
  });
  await sleep(1_000);
  const searchValue = await evaluate(client, `document.querySelector(${JSON.stringify(selector)})?.value`);
  assert.equal(searchValue, "e", "trusted recipe search input did not update");
}

async function assertMinimumSelectorCount(client, route) {
  if (!route.requiredSelector) return;
  const count = await evaluate(
    client,
    `document.querySelectorAll(${JSON.stringify(route.requiredSelector)}).length`,
  );
  assert.ok(
    count >= (route.minimumSelectorCount ?? 1),
    `${route.name} requires at least ${route.minimumSelectorCount ?? 1} matches for ${route.requiredSelector}, received ${count}`,
  );
}

async function exerciseRouteInteraction(client, route) {
  if (route.interaction === "recipe-search") {
    await exerciseRecipeSearch(client);
    return;
  }
  if (route.interaction === "servings") {
    await trustedClick(client, '[data-testid="recipe-servings-increase"]');
    await sleep(500);
    return;
  }
  if (route.interaction === "cooking" || route.interaction === "timer") {
    await trustedClick(client, '[data-testid="recipe-start-cooking"]');
    await sleep(500);
  }
  if (route.interaction === "timer") {
    await trustedClick(client, '[data-testid="cook-timer-toggle"]');
    await sleep(1_000);
    const timerLabel = await evaluate(
      client,
      `document.querySelector('[data-testid="cook-timer-toggle"]')?.textContent ?? ''`,
    );
    assert.match(timerLabel, /일시정지/, "release-candidate timer did not enter a running state");
  }
}

function summarizeResources(entries, navigation) {
  const resources = entries.map((entry) => ({
    decodedBodyBytes: entry.decodedBodySize,
    durationMilliseconds: round(entry.duration),
    initiatorType: entry.initiatorType,
    name: safeResourceName(entry.name),
    transferBytes: entry.transferSize,
  }));
  const navigationTransferBytes = navigation?.transferSize ?? 0;
  const jsTransferBytes = resources
    .filter((resource) => resource.initiatorType === "script" || /\.m?js(?:\?|$)/.test(resource.name))
    .reduce((total, resource) => total + resource.transferBytes, 0);
  const imageTransferBytes = resources
    .filter((resource) => resource.initiatorType === "img" || /\.(?:avif|gif|jpe?g|png|webp)(?:\?|$)/i.test(resource.name))
    .reduce((total, resource) => total + resource.transferBytes, 0);
  return {
    count: resources.length,
    jsTransferBytes,
    imageTransferBytes,
    totalDecodedBodyBytes:
      (navigation?.decodedBodySize ?? 0) +
      resources.reduce((total, resource) => total + resource.decodedBodyBytes, 0),
    totalTransferBytes:
      navigationTransferBytes +
      resources.reduce((total, resource) => total + resource.transferBytes, 0),
    largestTransfers: [...resources]
      .sort((left, right) => right.transferBytes - left.transferBytes)
      .slice(0, 5),
  };
}

async function captureRun(debugPort, route, runNumber) {
  const targetResponse = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  assert.equal(targetResponse.ok, true, `Chrome target creation failed: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const client = createClient(target.webSocketDebuggerUrl);
  const consoleErrors = [];
  const networkFailures = [];
  const expectedDependencyFailures = [];
  const expectedPlatformFailures = [];
  const requestUrls = new Map();

  try {
    await client.opened;
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Network.enable"),
    ]);
    client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
      consoleErrors.push(
        sanitizeRuntimeMessage(exceptionDetails.exception?.description ?? exceptionDetails.text),
      );
    });
    client.on("Runtime.consoleAPICalled", ({ type, args }) => {
      if (type !== "error") return;
      consoleErrors.push(
        sanitizeRuntimeMessage(
          args.map((argument) => argument.value ?? argument.description ?? "").join(" "),
        ),
      );
    });
    client.on("Network.responseReceived", ({ response, type }) => {
      if (response.status < 400) return;
      const failure = {
        resourceType: type,
        status: response.status,
        url: safeResourceName(response.url),
      };
      if (response.status === 503 && failure.url.startsWith("/api/v1/")) {
        expectedDependencyFailures.push(failure);
      } else {
        networkFailures.push(failure);
      }
    });
    client.on("Network.requestWillBeSent", ({ requestId, request }) => {
      requestUrls.set(requestId, request.url);
    });
    client.on("Network.loadingFailed", ({ blockedReason, canceled, errorText, requestId, type }) => {
      if (canceled) return;
      const requestUrl = requestUrls.get(requestId) ?? "";
      const failure = {
        blockedReason: blockedReason ?? null,
        errorText: sanitizeRuntimeMessage(errorText),
        resourceType: type,
        status: null,
        url: safeResourceName(requestUrl),
      };
      if (blockedReason === "csp" && requestUrl.startsWith("https://vercel.live/")) {
        expectedPlatformFailures.push(failure);
      } else {
        networkFailures.push(failure);
      }
    });
    await client.send("Page.addScriptToEvaluateOnNewDocument", { source: observerSource });
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: device.width,
      height: device.height,
      deviceScaleFactor: device.deviceScaleFactor,
      mobile: true,
      screenWidth: device.width,
      screenHeight: device.height,
    });
    await client.send("Emulation.setCPUThrottlingRate", {
      rate: device.cpuSlowdownMultiplier,
    });
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.clearBrowserCache");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: device.latencyMilliseconds,
      downloadThroughput: device.downloadBitsPerSecond / 8,
      uploadThroughput: device.uploadBitsPerSecond / 8,
      connectionType: "cellular4g",
    });

    const domReady = client.waitFor("Page.domContentEventFired", 45_000);
    await client.send("Page.navigate", { url: `${targetOrigin}${route.path}` });
    await domReady;
    await waitForPageText(client, route.expectedText);
    await sleep(settleMilliseconds);
    await assertMinimumSelectorCount(client, route);
    await exerciseRouteInteraction(client, route);

    const snapshot = await evaluate(
      client,
      `(() => {
        const state = window.__phase6Performance;
        const navigation = performance.getEntriesByType('navigation')[0] ?? null;
        const resources = performance.getEntriesByType('resource').map((entry) => ({
          decodedBodySize: entry.decodedBodySize,
          duration: entry.duration,
          initiatorType: entry.initiatorType,
          name: entry.name,
          transferSize: entry.transferSize,
        }));
        return {
          cls: state.cls,
          events: state.events,
          firstContentfulPaint: state.firstContentfulPaint,
          largestContentfulPaint: state.largestContentfulPaint,
          longTasks: state.longTasks,
          navigation: navigation ? {
            decodedBodySize: navigation.decodedBodySize,
            domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
            duration: navigation.duration,
            loadEventEnd: navigation.loadEventEnd,
            responseStart: navigation.responseStart,
            transferSize: navigation.transferSize,
          } : null,
          resources,
          searchInputLatency: state.searchInputLatency,
          unsupported: state.unsupported,
        };
      })()`,
    );

    assert.ok(snapshot.largestContentfulPaint, `${route.name} run ${runNumber} did not emit LCP`);
    if (route.interaction === "recipe-search") {
      assert.ok(
        snapshot.events.length > 0,
        `${route.name} run ${runNumber} did not emit trusted Event Timing entries`,
      );
      assert.ok(
        Number.isFinite(snapshot.searchInputLatency),
        `${route.name} run ${runNumber} did not measure input paint latency`,
      );
    }

    const maxInteractionDuration = snapshot.events.length
      ? Math.max(...snapshot.events.map((entry) => entry.duration))
      : null;
    const longTaskDuration = snapshot.longTasks.reduce(
      (total, entry) => total + entry.duration,
      0,
    );

    return {
      route: route.name,
      run: runNumber,
      lcpMilliseconds: round(snapshot.largestContentfulPaint.startTime),
      lcpElement: {
        ...snapshot.largestContentfulPaint,
        startTime: round(snapshot.largestContentfulPaint.startTime),
        url: snapshot.largestContentfulPaint.url
          ? safeResourceName(snapshot.largestContentfulPaint.url)
          : null,
      },
      cls: round(snapshot.cls, 4),
      fcpMilliseconds: round(snapshot.firstContentfulPaint ?? 0),
      ttfbMilliseconds: round(snapshot.navigation?.responseStart ?? 0),
      loadMilliseconds: round(snapshot.navigation?.loadEventEnd ?? 0),
      maxInteractionMilliseconds:
        maxInteractionDuration === null ? null : round(maxInteractionDuration),
      searchInputMilliseconds:
        snapshot.searchInputLatency === null ? null : round(snapshot.searchInputLatency),
      longTaskCount: snapshot.longTasks.length,
      totalLongTaskMilliseconds: round(longTaskDuration),
      longTaskOver50Count: snapshot.longTasks.filter(
        (entry) => entry.duration >= budgets.longTaskThresholdMilliseconds,
      ).length,
      resources: summarizeResources(snapshot.resources, snapshot.navigation),
      unsupportedObservers: snapshot.unsupported,
      consoleErrorCount: consoleErrors.length,
      hydrationErrorCount: consoleErrors.filter((message) => /hydration/i.test(message)).length,
      consoleErrors: consoleErrors.slice(0, 5),
      expectedDependencyErrorCount: expectedDependencyFailures.length,
      expectedDependencyErrors: expectedDependencyFailures.slice(0, 5),
      expectedPlatformErrorCount: expectedPlatformFailures.length,
      expectedPlatformErrors: expectedPlatformFailures.slice(0, 5),
      unexpectedNetworkErrorCount: networkFailures.length,
      unexpectedNetworkErrors: networkFailures.slice(0, 5),
    };
  } finally {
    try {
      await client.send("Page.close");
    } catch {
      // 이미 닫힌 target은 추가 정리가 필요하지 않습니다.
    }
    client.close();
  }
}

mkdirSync(evidenceDir, { recursive: true });
const userDataDir = mkdtempSync(path.join(os.tmpdir(), "jipbab-phase6-performance-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (existsSync(portFile)) {
      const [port] = readFileSync(portFile, "utf8").trim().split("\n");
      if (port) return Number(port);
    }
    await sleep(100);
  }
  throw new Error("Chrome DevTools port did not become ready");
}

const results = [];

try {
  const debugPort = await waitForDevToolsPort();
  for (const route of routes) {
    for (let runNumber = 1; runNumber <= runCount; runNumber += 1) {
      console.log(`Measuring ${route.name} run ${runNumber}/${runCount}`);
      results.push(await captureRun(debugPort, route, runNumber));
    }
  }
} finally {
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
}

const routeSummaries = routes.map((route) => {
  const routeResults = results.filter((result) => result.route === route.name);
  return {
    route: route.name,
    runs: routeResults.length,
    lcpP75Milliseconds: round(
      percentile(routeResults.map((result) => result.lcpMilliseconds), 0.75),
    ),
    clsP75: round(percentile(routeResults.map((result) => result.cls), 0.75), 4),
    fcpP75Milliseconds: round(
      percentile(routeResults.map((result) => result.fcpMilliseconds), 0.75),
    ),
    ttfbP75Milliseconds: round(
      percentile(routeResults.map((result) => result.ttfbMilliseconds), 0.75),
    ),
    transferP75Bytes: percentile(
      routeResults.map((result) => result.resources.totalTransferBytes),
      0.75,
    ),
    jsTransferP75Bytes: percentile(
      routeResults.map((result) => result.resources.jsTransferBytes),
      0.75,
    ),
    imageTransferP75Bytes: percentile(
      routeResults.map((result) => result.resources.imageTransferBytes),
      0.75,
    ),
    requestCountP75: percentile(
      routeResults.map((result) => result.resources.count),
      0.75,
    ),
    totalLongTaskP75Milliseconds: round(
      percentile(routeResults.map((result) => result.totalLongTaskMilliseconds), 0.75),
    ),
    longTaskOver50P75Count: percentile(
      routeResults.map((result) => result.longTaskOver50Count),
      0.75,
    ),
    consoleErrorCount: routeResults.reduce(
      (total, result) => total + result.consoleErrorCount,
      0,
    ),
    hydrationErrorCount: routeResults.reduce(
      (total, result) => total + result.hydrationErrorCount,
      0,
    ),
    expectedDependencyErrorCount: routeResults.reduce(
      (total, result) => total + result.expectedDependencyErrorCount,
      0,
    ),
    expectedPlatformErrorCount: routeResults.reduce(
      (total, result) => total + result.expectedPlatformErrorCount,
      0,
    ),
    unexpectedNetworkErrorCount: routeResults.reduce(
      (total, result) => total + result.unexpectedNetworkErrorCount,
      0,
    ),
  };
});

const interactionResults = results.filter(
  (result) => result.maxInteractionMilliseconds !== null,
);
const searchResults = results.filter((result) => result.searchInputMilliseconds !== null);
const interactionP75Milliseconds = interactionResults.length
  ? round(
      percentile(
        interactionResults.map((result) => result.maxInteractionMilliseconds),
        0.75,
      ),
    )
  : null;
const searchInputP75Milliseconds = searchResults.length
  ? round(
      percentile(
        searchResults.map((result) => result.searchInputMilliseconds),
        0.75,
      ),
    )
  : null;

const failures = [];
const missingBaselines = [];
const regressionMetrics = [
  ["transferP75Bytes", "totalTransferBytes", budgets.totalTransferIncreaseRatio],
  ["jsTransferP75Bytes", "jsTransferBytes", budgets.jsTransferIncreaseRatio],
  ["imageTransferP75Bytes", "imageTransferBytes", budgets.imageTransferIncreaseRatio],
  ["requestCountP75", "requestCount", budgets.requestCountIncreaseRatio],
  ["totalLongTaskP75Milliseconds", "totalLongTaskMilliseconds", budgets.totalLongTaskIncreaseRatio],
];
for (const summary of routeSummaries) {
  if (summary.lcpP75Milliseconds > budgets.lcpMilliseconds) {
    failures.push(
      `${summary.route} LCP p75 ${summary.lcpP75Milliseconds}ms > ${budgets.lcpMilliseconds}ms`,
    );
  }
  if (summary.clsP75 > budgets.cls) {
    failures.push(`${summary.route} CLS p75 ${summary.clsP75} > ${budgets.cls}`);
  }
  if (summary.ttfbP75Milliseconds > budgets.ttfbMilliseconds) {
    failures.push(`${summary.route} TTFB p75 ${summary.ttfbP75Milliseconds}ms > ${budgets.ttfbMilliseconds}ms`);
  }
  if (summary.consoleErrorCount > 0) {
    failures.push(`${summary.route} emitted ${summary.consoleErrorCount} console errors`);
  }
  if (summary.hydrationErrorCount > 0) {
    failures.push(`${summary.route} emitted ${summary.hydrationErrorCount} hydration errors`);
  }
  if (summary.unexpectedNetworkErrorCount > 0) {
    failures.push(
      `${summary.route} emitted ${summary.unexpectedNetworkErrorCount} unexpected network errors`,
    );
  }
  const baseline = regressionBaseline.routes?.[summary.route];
  for (const [summaryKey, baselineKey, allowedIncreaseRatio] of regressionMetrics) {
    const baselineValue = baseline?.[baselineKey];
    if (!Number.isFinite(baselineValue)) {
      missingBaselines.push(`${summary.route}.${baselineKey}`);
      continue;
    }
    const maximum = baselineValue * (1 + allowedIncreaseRatio);
    if (summary[summaryKey] > maximum) {
      failures.push(`${summary.route} ${summaryKey} ${summary[summaryKey]} > baseline ${baselineValue} +${allowedIncreaseRatio * 100}%`);
    }
  }
}
if (interactionP75Milliseconds === null) {
  failures.push("INP proxy is missing trusted interaction timing");
} else if (interactionP75Milliseconds > budgets.inpMilliseconds) {
  failures.push(
    `interaction p75 ${interactionP75Milliseconds}ms > ${budgets.inpMilliseconds}ms`,
  );
}
if (searchInputP75Milliseconds === null) {
  failures.push("search input paint latency is missing");
} else if (searchInputP75Milliseconds > budgets.searchInputMilliseconds) {
  failures.push(
    `search input p75 ${searchInputP75Milliseconds}ms > ${budgets.searchInputMilliseconds}ms`,
  );
}
if (measurementProfile === "release-candidate" && missingBaselines.length > 0) {
  failures.push(`release-candidate regression baselines are missing: ${missingBaselines.join(", ")}`);
}

const evidence = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  measurementClass: "repeatable_mobile_lab_guard_not_field_p75",
  measurementProfile,
  origin: targetOrigin,
  budgets,
  device,
  runCount,
  routeSummaries,
  interactionP75Milliseconds,
  searchInputP75Milliseconds,
  failures,
  missingBaselines,
  results,
};
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

console.log("Phase 6 mobile performance capture");
console.log(`Origin: ${targetOrigin}`);
console.log(`Profile: 390x844, CPU ${device.cpuSlowdownMultiplier}x, 1.6 Mbps / 150ms RTT`);
for (const summary of routeSummaries) {
  console.log(
    `- ${summary.route}: LCP p75=${summary.lcpP75Milliseconds}ms, CLS p75=${summary.clsP75}, FCP p75=${summary.fcpP75Milliseconds}ms, TTFB p75=${summary.ttfbP75Milliseconds}ms, transfer p75=${summary.transferP75Bytes}B, JS=${summary.jsTransferP75Bytes}B, image=${summary.imageTransferP75Bytes}B, requests=${summary.requestCountP75}, long tasks=${summary.totalLongTaskP75Milliseconds}ms, console errors=${summary.consoleErrorCount}, hydration errors=${summary.hydrationErrorCount}, unexpected network errors=${summary.unexpectedNetworkErrorCount}, expected dependency errors=${summary.expectedDependencyErrorCount}, expected platform errors=${summary.expectedPlatformErrorCount}`,
  );
}
console.log(`- interaction p75=${interactionP75Milliseconds ?? "missing"}ms`);
console.log(`- search input paint p75=${searchInputP75Milliseconds ?? "missing"}ms`);
console.log(`Evidence: ${evidencePath}`);
console.log(`Missing regression baselines: ${missingBaselines.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS");
console.log("- repeatable mobile lab budgets passed; production field p75 remains a separate requirement");
