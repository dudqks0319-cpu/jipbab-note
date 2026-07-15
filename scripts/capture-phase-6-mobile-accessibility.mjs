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
const auditUrls = process.env.PHASE6_ACCESSIBILITY_PATHS
  ? process.env.PHASE6_ACCESSIBILITY_PATHS.split(",")
      .map((route) => route.trim())
      .filter(Boolean)
      .map((route) => new URL(route, baseUrl).toString())
  : [baseUrl];
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const widths = (process.env.PHASE6_ACCESSIBILITY_WIDTHS ?? "360,390,430")
  .split(",")
  .map((width) => Number(width.trim()))
  .filter((width) => Number.isFinite(width) && width >= 320);
const height = 844;
const settleMilliseconds = Number(process.env.PHASE6_ACCESSIBILITY_SETTLE_MS ?? 3500);
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
  const textFromIds = (ids) => ids
    .split(/\\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim() || '')
    .filter(Boolean)
    .join(' ');
  const explicitName = (element) => {
    const ariaLabel = element.getAttribute('aria-label')?.trim() || '';
    const labelledBy = textFromIds(element.getAttribute('aria-labelledby') || '');
    const labels = 'labels' in element
      ? [...(element.labels || [])].map((label) => label.textContent?.trim() || '').filter(Boolean).join(' ')
      : '';
    const title = element.getAttribute('title')?.trim() || '';
    const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt')?.trim() || '';
    const visibleText = element.matches('button, a[href], [role="button"]')
      ? element.textContent?.trim() || ''
      : '';
    return ariaLabel || labelledBy || labels || title || imageAlt || visibleText;
  };
  const fields = controls.filter((element) => element.matches('input, select, textarea'));
  const unlabeledFields = fields.flatMap((element) => {
    if (explicitName(element)) return [];
    return [{
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute('type') || '',
      placeholder: element.getAttribute('placeholder') || '',
    }];
  });
  const namedControlCandidates = controls.filter((element) => element.matches('button, a[href], [role="button"]'));
  const unnamedControls = namedControlCandidates.flatMap((element) => {
    if (explicitName(element)) return [];
    return [{
      tag: element.tagName.toLowerCase(),
      className: String(element.className || '').slice(0, 100),
    }];
  });
  const parseColor = (value) => {
    const match = value.match(/^rgba?\\(([^)]+)\\)$/i);
    if (!match) return null;
    const channels = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if (channels.length < 3 || channels.some((channel) => !Number.isFinite(channel))) return null;
    return {
      red: channels[0],
      green: channels[1],
      blue: channels[2],
      alpha: channels[3] ?? 1,
    };
  };
  const composite = (foreground, background) => ({
    red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
    green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
    blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
    alpha: 1,
  });
  const effectiveBackground = (element) => {
    const layers = [];
    let current = element;
    while (current) {
      const style = getComputedStyle(current);
      if (style.backgroundImage !== 'none') return null;
      const color = parseColor(style.backgroundColor);
      if (color && color.alpha > 0) layers.push(color);
      current = current.parentElement;
    }
    return layers.reverse().reduce(
      (background, layer) => composite(layer, background),
      { red: 255, green: 255, blue: 255, alpha: 1 },
    );
  };
  const luminance = (color) => {
    const channels = [color.red, color.green, color.blue]
      .map((channel) => channel / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const ratio = (foreground, background) => {
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  };
  const contrastFailures = [...document.querySelectorAll('body *')].flatMap((element) => {
    if (element.closest('[disabled], [aria-disabled="true"]')) return [];
    const directText = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim() || '')
      .filter(Boolean)
      .join(' ');
    if (!directText) return [];
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (
      element.classList.contains('sr-only') ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number(style.opacity) < 0.95 ||
      rect.width <= 1 ||
      rect.height <= 1
    ) return [];
    const background = effectiveBackground(element);
    const foregroundLayer = parseColor(style.color);
    if (!background || !foregroundLayer) return [];
    const foreground = composite(foregroundLayer, background);
    const fontSize = Number.parseFloat(style.fontSize);
    const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
    const minimum = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
    const actual = ratio(foreground, background);
    if (actual + 0.01 >= minimum) return [];
    return [{
      tag: element.tagName.toLowerCase(),
      text: directText.slice(0, 80),
      foreground: style.color,
      background: getComputedStyle(element).backgroundColor,
      ratio: Math.round(actual * 100) / 100,
      minimum,
    }];
  }).slice(0, 50);
  const skipLink = document.querySelector('a[href="#main-content"]');
  const keyboardFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null;
  skipLink?.focus();
  const skipRect = skipLink?.getBoundingClientRect();
  const skipLinkVisibleOnFocus = Boolean(
    skipRect && skipRect.width >= 44 && skipRect.height >= 44 && document.activeElement === skipLink
  );
  keyboardFocus?.focus();
  const focusCandidate = keyboardFocus;
  const focusStyle = focusCandidate ? getComputedStyle(focusCandidate) : null;
  const focusIndicatorVisible = Boolean(
    focusCandidate &&
    document.activeElement === focusCandidate &&
    focusCandidate.matches(':focus-visible') &&
    focusStyle &&
    focusStyle.outlineStyle !== 'none' &&
    Number.parseFloat(focusStyle.outlineWidth) >= 2
  );
  const frameworkOverlay = Boolean(
    document.querySelector('[data-nextjs-dialog-overlay], nextjs-portal [role="dialog"], #webpack-dev-server-client-overlay')
  );
  const viewportMeta = document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
  return {
    innerWidth: window.innerWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    visibleControlCount: controls.length,
    undersized,
    unlabeledFields,
    unnamedControls,
    contrastFailures,
    hasMain: Boolean(document.querySelector('main#main-content[tabindex="-1"]')),
    hasSkipLink: Boolean(skipLink),
    skipLinkVisibleOnFocus,
    focusIndicatorVisible,
    frameworkOverlay,
    documentTextPresent: Boolean(document.body.innerText.trim()),
    viewportMeta,
  };
})()`;

const results = [];

try {
  const port = await waitForDevToolsPort();
  for (const auditUrl of auditUrls) {
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
      await client.send("Page.navigate", { url: auditUrl });
      await loaded;
      await sleep(settleMilliseconds);
      await client.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
      await client.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      });
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
      const auditedLocation = new URL(auditUrl);
      const routeBaseLabel = auditedLocation.pathname === "/"
        ? "home"
        : auditedLocation.pathname.replace(/^\/+|\/+$/g, "").replaceAll("/", "-");
      const routeLabel = auditedLocation.searchParams.get("add") === "1"
        ? `${routeBaseLabel}-dialog`
        : routeBaseLabel;
      const screenshotPath = path.join(evidenceDir, `phase6-accessibility-${routeLabel}-${width}-cdp.png`);
      writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
      results.push({ url: auditUrl, routeLabel, width, screenshotPath, ...audit });
      await client.send("Page.close");
      client.close();
    }
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
  const scope = `${result.routeLabel} ${result.width}px`;
  if (result.innerWidth !== result.width || result.documentClientWidth !== result.width) {
    widthFailures.push(`${scope} device metrics were not applied`);
  }
  if (result.documentScrollWidth > result.width || result.bodyScrollWidth > result.width) {
    widthFailures.push(`${scope} has horizontal overflow`);
  }
  if (result.undersized.length > 0) {
    widthFailures.push(`${scope} has ${result.undersized.length} controls below 44px`);
  }
  if (result.unlabeledFields.length > 0) {
    widthFailures.push(`${scope} has ${result.unlabeledFields.length} form fields without explicit labels`);
  }
  if (result.unnamedControls.length > 0) {
    widthFailures.push(`${scope} has ${result.unnamedControls.length} controls without accessible names`);
  }
  if (result.contrastFailures.length > 0) {
    widthFailures.push(`${scope} has ${result.contrastFailures.length} visible text contrast failures`);
  }
  if (!result.hasMain || !result.hasSkipLink) {
    widthFailures.push(`${scope} is missing the main landmark or skip link`);
  }
  if (!result.skipLinkVisibleOnFocus) {
    widthFailures.push(`${scope} skip link is not visible and 44px on focus`);
  }
  if (!result.focusIndicatorVisible) {
    widthFailures.push(`${scope} has no visible focus indicator on the first available control`);
  }
  if (!result.documentTextPresent || result.frameworkOverlay) {
    widthFailures.push(`${scope} is blank or covered by a framework error overlay`);
  }
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(result.viewportMeta)) {
    widthFailures.push(`${scope} disables user zoom`);
  }
  return widthFailures;
});

console.log("Phase 6 mobile accessibility runtime capture");
for (const result of results) {
  console.log(
    `- ${result.routeLabel} ${result.width}px: controls=${result.visibleControlCount}, undersized=${result.undersized.length}, unlabeled=${result.unlabeledFields.length}, unnamed=${result.unnamedControls.length}, contrast=${result.contrastFailures.length}, focus=${result.focusIndicatorVisible ? "visible" : "missing"}, scroll=${result.documentScrollWidth}/${result.width}, screenshot=${result.screenshotPath}`,
  );
  for (const item of result.undersized) {
    console.log(`  - ${item.tag} ${item.width}x${item.height}: ${item.label}`);
  }
  for (const item of result.unlabeledFields) {
    console.log(`  - unlabeled ${item.tag}[${item.type}]: ${item.placeholder}`);
  }
  for (const item of result.unnamedControls) {
    console.log(`  - unnamed ${item.tag}: ${item.className}`);
  }
  for (const item of result.contrastFailures) {
    console.log(`  - contrast ${item.ratio}:1/${item.minimum}:1 ${item.tag}: ${item.text} (${item.foreground})`);
  }
}
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS");
console.log(`- ${auditUrls.length} route(s) at ${widths.join("px, ")}px passed runtime accessibility checks`);
