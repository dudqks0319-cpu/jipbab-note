import { createSign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPaths = [
  path.join(cwd, ".env.local"),
  path.join(cwd, ".env.android-signing.local"),
  path.join(cwd, ".env.store-api.local"),
];
const appStoreConnectApiBaseUrl = "https://api.appstoreconnect.apple.com";
const defaultBundleId = "com.jipbab.note";
const defaultVersionString = "1.0";
const defaultScreenshotDisplayType = "APP_IPHONE_67";
const defaultScreenshotDir =
  "output/release-evidence/2026-06-27T-appstore-screenshot-refresh/screenshots";

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const deleteExisting = args.has("--delete-existing-after-upload");

function readConfiguredEnv() {
  const values = {};
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue;
    }
    const content = readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  }
  return { ...values, ...process.env };
}

function envValue(env, key) {
  return env[key]?.trim() ?? "";
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt({ header, payload, privateKey }) {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const input = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("SHA256");
  signer.update(input);
  signer.end();
  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${input}.${base64url(signature)}`;
}

function readPrivateKeyFile(filePath) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error("App Store Connect private key file is missing");
  }
  return readFileSync(resolvedPath, "utf8");
}

function buildAppStoreConnectJwt(env) {
  const keyId = envValue(env, "APP_STORE_CONNECT_API_KEY_ID");
  const issuerId = envValue(env, "APP_STORE_CONNECT_API_ISSUER_ID");
  const privateKeyPath = envValue(env, "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH");
  if (!keyId || !issuerId || !privateKeyPath) {
    throw new Error("App Store Connect API credentials are incomplete");
  }
  const now = Math.floor(Date.now() / 1000);
  const privateKey = readPrivateKeyFile(privateKeyPath);
  return signJwt({
    privateKey,
    header: {
      alg: "ES256",
      kid: keyId,
      typ: "JWT",
    },
    payload: {
      iss: issuerId,
      aud: "appstoreconnect-v1",
      iat: now,
      exp: now + 15 * 60,
    },
  });
}

async function requestJson({ pathSuffix, token, method = "GET", body, label }) {
  const response = await fetch(`${appStoreConnectApiBaseUrl}${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  if (!response.ok) {
    const details = (json?.errors ?? [])
      .map((error) => [error.status, error.code, error.title, error.detail].filter(Boolean).join(" "))
      .join("; ");
    throw new Error(`${label}: HTTP ${response.status}${details ? ` - ${details}` : ""}`);
  }
  return json ?? {};
}

async function requestEmpty({ pathSuffix, token, method, label }) {
  const response = await fetch(`${appStoreConnectApiBaseUrl}${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    const details = (json?.errors ?? [])
      .map((error) => [error.status, error.code, error.title, error.detail].filter(Boolean).join(" "))
      .join("; ");
    throw new Error(`${label}: HTTP ${response.status}${details ? ` - ${details}` : ""}`);
  }
}

async function uploadOperation({ operation, buffer, label }) {
  const offset = Number(operation.offset ?? 0);
  const length = Number(operation.length ?? buffer.length);
  const chunk = buffer.subarray(offset, offset + length);
  const headers = {};
  for (const header of operation.requestHeaders ?? []) {
    headers[header.name] = header.value;
  }
  const response = await fetch(operation.url, {
    method: operation.method,
    headers,
    body: chunk,
  });
  if (!response.ok) {
    throw new Error(`${label}: upload operation failed with HTTP ${response.status}`);
  }
}

function readPngInfo(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.readUInt32BE(0) !== 0x89504e47 || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`${path.relative(cwd, filePath)} is not a PNG file`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function screenshotFiles(screenshotDir) {
  const names = ["01-home.png", "02-fridge.png", "03-recipe.png", "04-shopping.png", "05-mypage.png"];
  return names.map((name) => {
    const filePath = path.join(cwd, screenshotDir, name);
    if (!existsSync(filePath)) {
      throw new Error(`Missing screenshot: ${path.relative(cwd, filePath)}`);
    }
    const info = readPngInfo(filePath);
    if (info.width !== 1290 || info.height !== 2796) {
      throw new Error(`${path.relative(cwd, filePath)} must be 1290x2796, got ${info.width}x${info.height}`);
    }
    return { name, filePath };
  });
}

async function findApp({ bundleId, token }) {
  const appQuery = new URLSearchParams({
    "filter[bundleId]": bundleId,
    "fields[apps]": "bundleId,name",
    limit: "1",
  });
  const apps = await requestJson({
    pathSuffix: `/v1/apps?${appQuery}`,
    token,
    label: "App Store Connect apps lookup",
  });
  const app = apps.data?.[0];
  if (!app?.id) {
    throw new Error(`App Store app record not found for bundle id ${bundleId}`);
  }
  return app;
}

async function findAppStoreVersion({ appId, versionString, token }) {
  const versionQuery = new URLSearchParams({
    "filter[platform]": "IOS",
    "filter[versionString]": versionString,
    "fields[appStoreVersions]": "versionString,appStoreState,platform",
    limit: "10",
  });
  const versions = await requestJson({
    pathSuffix: `/v1/apps/${encodeURIComponent(appId)}/appStoreVersions?${versionQuery}`,
    token,
    label: "App Store versions lookup",
  });
  const appStoreVersion = (versions.data ?? []).find(
    (item) => item?.attributes?.versionString === versionString && item?.attributes?.platform === "IOS",
  );
  if (!appStoreVersion?.id) {
    throw new Error(`App Store version ${versionString} for iOS was not found`);
  }
  return appStoreVersion;
}

async function findLocalizationAndScreenshotSet({ appStoreVersionId, displayType, token }) {
  const localizationQuery = new URLSearchParams({
    "fields[appStoreVersionLocalizations]": "locale",
    "fields[appScreenshotSets]": "screenshotDisplayType",
    include: "appScreenshotSets",
    limit: "20",
  });
  const localizations = await requestJson({
    pathSuffix: `/v1/appStoreVersions/${encodeURIComponent(appStoreVersionId)}/appStoreVersionLocalizations?${localizationQuery}`,
    token,
    label: "App Store version localizations lookup",
  });
  const localization = (localizations.data ?? []).find((item) => item?.attributes?.locale === "ko");
  if (!localization?.id) {
    throw new Error("Korean App Store version localization was not found");
  }
  const screenshotSet = (localizations.included ?? []).find(
    (item) => item?.type === "appScreenshotSets" && item?.attributes?.screenshotDisplayType === displayType,
  );
  if (!screenshotSet?.id) {
    throw new Error(`Screenshot set ${displayType} was not found`);
  }
  return { localization, screenshotSet };
}

async function listScreenshots({ screenshotSetId, token }) {
  const screenshotQuery = new URLSearchParams({
    "fields[appScreenshots]": "fileName,fileSize,sourceFileChecksum,assetDeliveryState,imageAsset,uploadOperations",
    limit: "20",
  });
  const screenshots = await requestJson({
    pathSuffix: `/v1/appScreenshotSets/${encodeURIComponent(screenshotSetId)}/appScreenshots?${screenshotQuery}`,
    token,
    label: "App Store screenshots lookup",
  });
  return screenshots.data ?? [];
}

function createScreenshotBody({ screenshotSetId, fileName, fileSize }) {
  return {
    data: {
      type: "appScreenshots",
      attributes: {
        fileName,
        fileSize,
      },
      relationships: {
        appScreenshotSet: {
          data: {
            type: "appScreenshotSets",
            id: screenshotSetId,
          },
        },
      },
    },
  };
}

async function createScreenshot({ screenshotSetId, file, token }) {
  const buffer = readFileSync(file.filePath);
  const created = await requestJson({
    pathSuffix: "/v1/appScreenshots",
    token,
    method: "POST",
    body: createScreenshotBody({
      screenshotSetId,
      fileName: file.name,
      fileSize: buffer.length,
    }),
    label: `Create App Store screenshot ${file.name}`,
  });
  const screenshot = created.data;
  for (const operation of screenshot?.attributes?.uploadOperations ?? []) {
    await uploadOperation({ operation, buffer, label: file.name });
  }
  await requestJson({
    pathSuffix: `/v1/appScreenshots/${encodeURIComponent(screenshot.id)}`,
    token,
    method: "PATCH",
    body: {
      data: {
        type: "appScreenshots",
        id: screenshot.id,
        attributes: {
          uploaded: true,
        },
      },
    },
    label: `Finalize App Store screenshot ${file.name}`,
  });
  return screenshot;
}

async function fetchScreenshot({ screenshotId, token }) {
  const screenshotQuery = new URLSearchParams({
    "fields[appScreenshots]": "fileName,fileSize,sourceFileChecksum,assetDeliveryState,imageAsset",
  });
  return requestJson({
    pathSuffix: `/v1/appScreenshots/${encodeURIComponent(screenshotId)}?${screenshotQuery}`,
    token,
    label: `Fetch App Store screenshot ${screenshotId}`,
  });
}

async function waitForScreenshots({ screenshots, token }) {
  const pending = new Map(screenshots.map((screenshot) => [screenshot.id, screenshot]));
  const completed = [];
  for (let attempt = 0; attempt < 36 && pending.size > 0; attempt += 1) {
    for (const [id] of [...pending]) {
      const fetched = await fetchScreenshot({ screenshotId: id, token });
      const screenshot = fetched.data;
      const state = screenshot?.attributes?.assetDeliveryState?.state ?? "unknown";
      const errors = screenshot?.attributes?.assetDeliveryState?.errors ?? [];
      if (errors.length > 0) {
        throw new Error(`${screenshot?.attributes?.fileName ?? id} processing failed: ${JSON.stringify(errors)}`);
      }
      if (state === "COMPLETE") {
        completed.push(screenshot);
        pending.delete(id);
      }
    }
    if (pending.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  if (pending.size > 0) {
    throw new Error(`Timed out waiting for screenshots: ${[...pending.keys()].join(", ")}`);
  }
  return completed;
}

async function deleteScreenshots({ screenshots, token }) {
  for (const screenshot of screenshots) {
    await requestEmpty({
      pathSuffix: `/v1/appScreenshots/${encodeURIComponent(screenshot.id)}`,
      token,
      method: "DELETE",
      label: `Delete App Store screenshot ${screenshot.attributes?.fileName ?? screenshot.id}`,
    });
  }
}

function evidenceSummary({ app, appStoreVersion, screenshotSet, screenshotDir, oldScreenshots, newScreenshots, finalScreenshots }) {
  const lines = [
    "# App Store Screenshot Refresh Evidence",
    "",
    `- Date: ${new Date().toISOString()}`,
    "- Platform: App Store / iOS only",
    `- App name: ${app.attributes?.name ?? "unknown"}`,
    `- Bundle ID: ${app.attributes?.bundleId ?? "unknown"}`,
    `- App Store version: ${appStoreVersion.attributes?.versionString ?? "unknown"}`,
    `- App Store version state: ${appStoreVersion.attributes?.appStoreState ?? "unknown"}`,
    `- Screenshot display type: ${screenshotSet.attributes?.screenshotDisplayType ?? "unknown"}`,
    `- Source screenshot dir: ${screenshotDir}`,
    "",
    "## Replaced Screenshots",
    "",
    ...oldScreenshots.map(
      (screenshot) =>
        `- old ${screenshot.attributes?.fileName ?? "unknown"} (${screenshot.id}) md5:${screenshot.attributes?.sourceFileChecksum ?? "unknown"}`,
    ),
    "",
    "## Uploaded Screenshots",
    "",
    ...newScreenshots.map(
      (screenshot) =>
        `- new ${screenshot.attributes?.fileName ?? "unknown"} (${screenshot.id}) state:${screenshot.attributes?.assetDeliveryState?.state ?? "unknown"} md5:${screenshot.attributes?.sourceFileChecksum ?? "unknown"}`,
    ),
    "",
    "## Final Screenshot Set",
    "",
    ...finalScreenshots.map(
      (screenshot) =>
        `- ${screenshot.attributes?.fileName ?? "unknown"} (${screenshot.id}) state:${screenshot.attributes?.assetDeliveryState?.state ?? "unknown"} ${screenshot.attributes?.imageAsset?.width ?? "?"}x${screenshot.attributes?.imageAsset?.height ?? "?"}`,
    ),
    "",
    "## Notes",
    "",
    "- Existing screenshots were deleted only after the new screenshots reached COMPLETE.",
    "- Upload URLs, API tokens, and private-key contents were not printed or saved.",
    "- No Google Play submission was attempted.",
  ];
  return `${lines.join("\n")}\n`;
}

async function run() {
  const env = readConfiguredEnv();
  const bundleId = envValue(env, "APP_STORE_CONNECT_BUNDLE_ID") || defaultBundleId;
  const versionString = envValue(env, "APP_STORE_CONNECT_VERSION_STRING") || defaultVersionString;
  const screenshotDir = envValue(env, "APP_STORE_CONNECT_SCREENSHOT_DIR") || defaultScreenshotDir;
  const screenshotDisplayType =
    envValue(env, "APP_STORE_CONNECT_SCREENSHOT_DISPLAY_TYPE") || defaultScreenshotDisplayType;
  const files = screenshotFiles(screenshotDir);
  const token = buildAppStoreConnectJwt(env);
  const app = await findApp({ bundleId, token });
  const appStoreVersion = await findAppStoreVersion({ appId: app.id, versionString, token });
  const { screenshotSet } = await findLocalizationAndScreenshotSet({
    appStoreVersionId: appStoreVersion.id,
    displayType: screenshotDisplayType,
    token,
  });
  const oldScreenshots = await listScreenshots({ screenshotSetId: screenshotSet.id, token });

  console.log("App Store screenshot refresh");
  console.log(`Mode: ${execute ? "execute" : "dry-run"}`);
  console.log(`Bundle ID: ${bundleId}`);
  console.log(`Version: ${versionString}`);
  console.log(`Screenshot set: ${screenshotDisplayType}`);
  console.log(`Existing screenshots: ${oldScreenshots.length}`);
  console.log(`New screenshots: ${files.map((file) => file.name).join(", ")}`);

  if (!execute) {
    console.log("Dry run only. Re-run with --execute --delete-existing-after-upload to replace screenshots.");
    return;
  }

  const createdScreenshots = [];
  for (const file of files) {
    const created = await createScreenshot({ screenshotSetId: screenshotSet.id, file, token });
    createdScreenshots.push(created);
    console.log(`Uploaded ${file.name}`);
  }
  const completedScreenshots = await waitForScreenshots({ screenshots: createdScreenshots, token });
  console.log(`Completed screenshots: ${completedScreenshots.length}`);

  if (deleteExisting) {
    await deleteScreenshots({ screenshots: oldScreenshots, token });
    console.log(`Deleted old screenshots: ${oldScreenshots.length}`);
  }

  const finalScreenshots = await listScreenshots({ screenshotSetId: screenshotSet.id, token });
  const outDir = path.join(cwd, "output", "release-evidence", "2026-06-27T-appstore-screenshot-refresh");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "appstore-screenshot-refresh.md"),
    evidenceSummary({
      app,
      appStoreVersion,
      screenshotSet,
      screenshotDir,
      oldScreenshots,
      newScreenshots: completedScreenshots,
      finalScreenshots,
    }),
  );
  console.log(`Final screenshots: ${finalScreenshots.length}`);
  console.log(`Evidence: ${path.relative(cwd, path.join(outDir, "appstore-screenshot-refresh.md"))}`);
}

run().catch((error) => {
  console.error("App Store screenshot refresh failed");
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
