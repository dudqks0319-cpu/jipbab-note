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

const baseUrl = process.env.PHASE6_ACCESSIBILITY_URL ?? "http://127.0.0.1:4327/?demo=appstore";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const widths = [360, 390, 430];
const height = 844;
const evidenceDir = path.resolve("output/ui-evidence");

if (!existsSync(chromePath)) {
  throw new Error(`Chrome not found: ${chromePath}`);
}

mkdirSync(evidenceDir, { recursive: true });
const userDataDir = mkdtempSync(path.join(os.tmpdir(), "jipbab-phase6-cdp-"));
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

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
    waitFor(method, timeoutMs = 15000) {
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

const browserAuditExpression = `(() => {
  const candidates = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"]')];
  const controls = candidates.filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const hiddenSkipLink = element.classList.contains('sr-only') && document.activeElement !== element;
    return !hiddenSkipLink && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
  const undersized = controls.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width >= 44 && rect.height >= 44) return [];
    return [{
      tag: element.tagName.toLowerCase(),
      label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 60) || '',
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    }];
  });
  const skipLink = document.querySelector('a[href="#main-content"]');
  skipLink?.focus();
  const skipRect = skipLink?.getBoundingClientRect();
  const skipLinkVisibleOnFocus = Boolean(
    skipRect && skipRect.width >= 44 && skipRect.height >= 44 && document.activeElement === skipLink
  );
  skipLink?.blur();
  const viewportMeta = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
  return {
    innerWidth: window.innerWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    visibleControlCount: controls.length,
    undersized,
    hasMain: Boolean(document.querySelector('main#main-content[tabindex="-1"]')),
    hasSkipLink: Boolean(skipLink),
    skipLinkVisibleOnFocus,
    viewportMeta,
  };
})()`;

const results = [];

try {
  const port = await waitForDevToolsPort();
  for (const width of widths) {
    const targetResponse = await fetch(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent("about:blank")}`,
      { method: "PUT" },
    );
    if (!targetResponse.ok) throw new Error(`Chrome target creation failed: ${targetResponse.status}`);
    const target = await targetResponse.json();
    const client = createClient(target.webSocketDebuggerUrl);
    await client.opened;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: width,
      screenHeight: height,
    });
    const loaded = client.waitFor("Page.loadEventFired");
    await client.send("Page.navigate", { url: baseUrl });
    await loaded;
    await sleep(5000);
    const evaluation = await client.send("Runtime.evaluate", {
      expression: browserAuditExpression,
      returnByValue: true,
    });
    const audit = evaluation.result.value;
    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    const screenshotPath = path.join(evidenceDir, `phase6-accessibility-home-${width}-cdp.png`);
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
    results.push({ width, screenshotPath, ...audit });
    await client.send("Page.close");
    client.close();
  }
} finally {
  chrome.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => chrome.once("exit", resolve)),
    sleep(2000),
  ]);
  if (chrome.exitCode === null) {
    chrome.kill("SIGKILL");
    await sleep(200);
  }
  rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

const failures = results.flatMap((result) => {
  const widthFailures = [];
  if (result.innerWidth !== result.width || result.documentClientWidth !== result.width) {
    widthFailures.push(`${result.width}px device metrics were not applied`);
  }
  if (result.documentScrollWidth > result.width || result.bodyScrollWidth > result.width) {
    widthFailures.push(`${result.width}px has horizontal overflow`);
  }
  if (result.undersized.length > 0) {
    widthFailures.push(`${result.width}px has ${result.undersized.length} controls below 44px`);
  }
  if (!result.hasMain || !result.hasSkipLink) {
    widthFailures.push(`${result.width}px is missing the main landmark or skip link`);
  }
  if (!result.skipLinkVisibleOnFocus) {
    widthFailures.push(`${result.width}px skip link is not visible and 44px on focus`);
  }
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(result.viewportMeta)) {
    widthFailures.push(`${result.width}px disables user zoom`);
  }
  return widthFailures;
});

console.log("Phase 6 mobile accessibility runtime capture");
for (const result of results) {
  console.log(
    `- ${result.width}px: controls=${result.visibleControlCount}, undersized=${result.undersized.length}, scroll=${result.documentScrollWidth}/${result.width}, screenshot=${result.screenshotPath}`,
  );
  for (const item of result.undersized) {
    console.log(`  - ${item.tag} ${item.width}x${item.height}: ${item.label}`);
  }
}
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS");
console.log("- 360px, 390px, and 430px runtime accessibility checks passed");
