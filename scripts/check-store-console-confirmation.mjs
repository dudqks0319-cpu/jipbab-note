import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const evidencePath = path.join(process.cwd(), "docs/store-console-confirmation.md");
const envPaths = [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env.android-signing.local")];
const appStoreConnectApiBaseUrl = "https://api.appstoreconnect.apple.com";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleAndroidPublisherBaseUrl = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const androidPublisherScope = "https://www.googleapis.com/auth/androidpublisher";
const defaultBundleId = "com.jipbab.note";
const defaultIosBuild = "2026052001";
const defaultAndroidVersionCode = "1";
const defaultPlayTrack = "internal";

const apiCredentialGroups = [
  {
    label: "App Store Connect API",
    envNames: [
      "APP_STORE_CONNECT_API_KEY_ID",
      "APP_STORE_CONNECT_API_ISSUER_ID",
      "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH",
    ],
  },
  {
    label: "Google Play Developer API",
    envNames: ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "GOOGLE_APPLICATION_CREDENTIALS"],
    anyOf: true,
  },
];

const requiredEvidence = [
  {
    label: "App Store Connect/TestFlight",
    terms: [
      "App Store Connect/TestFlight: confirmed",
      "Bundle ID: com.jipbab.note",
      "iOS build: 2026052001",
      "TestFlight processing: confirmed",
      "Internal tester availability: confirmed",
    ],
    patterns: [
      {
        label: "App Store Connect evidence date: YYYY-MM-DD",
        pattern: /App Store Connect evidence date: 20\d{2}-\d{2}-\d{2}/,
      },
    ],
    artifactLabels: ["App Store Connect evidence artifacts"],
  },
  {
    label: "Google Play Console internal testing",
    terms: [
      "Play Console internal testing: confirmed",
      "Android package: com.jipbab.note",
      "AAB upload: confirmed",
      "Internal testing track: confirmed",
    ],
    patterns: [
      {
        label: "Play Console evidence date: YYYY-MM-DD",
        pattern: /Play Console evidence date: 20\d{2}-\d{2}-\d{2}/,
      },
    ],
    artifactLabels: ["Play Console evidence artifacts"],
  },
];

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

function lineValue(source, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^\\s*-\\s*${escapedLabel}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function artifactExists(value) {
  const normalized = value.replace(/^`|`$/g, "").trim();
  if (!normalized || normalized === "pending") {
    return false;
  }
  if (/^https?:\/\//.test(normalized)) {
    return true;
  }
  const artifactPath = path.isAbsolute(normalized) ? normalized : path.join(process.cwd(), normalized);
  return existsSync(artifactPath);
}

function missingExtraEvidence(source, item) {
  const missingPatterns = (item.patterns ?? [])
    .filter((requirement) => !requirement.pattern.test(source))
    .map((requirement) => requirement.label);
  const missingArtifacts = (item.artifactLabels ?? [])
    .filter((label) => !artifactExists(lineValue(source, label)))
    .map((label) => `${label}: existing local path or URL`);
  return [...missingPatterns, ...missingArtifacts];
}

function readConfiguredEnvNames() {
  return new Set(
    Object.entries(readConfiguredEnv())
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key]) => key),
  );
}

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

function missingApiCredentialGroups(configuredEnvNames) {
  return apiCredentialGroups.flatMap((group) => {
    const present = group.envNames.filter((name) => configuredEnvNames.has(name));
    const complete = group.anyOf ? present.length > 0 : present.length === group.envNames.length;
    if (complete) {
      return [];
    }

    return [
      {
        label: group.label,
        missing: group.anyOf ? [`one of ${group.envNames.join(", ")}`] : group.envNames.filter((name) => !present.includes(name)),
      },
    ];
  });
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt({ header, payload, privateKey, algorithm = "RSA-SHA256", dsaEncoding }) {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const input = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign(algorithm);
  signer.update(input);
  signer.end();
  const signature = signer.sign(
    dsaEncoding ? { key: privateKey, dsaEncoding } : privateKey,
  );
  return `${input}.${base64url(signature)}`;
}

function envValue(env, key) {
  return env[key]?.trim() ?? "";
}

function readPrivateKeyFile(filePath) {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error("private key file is missing");
  }
  return readFileSync(resolvedPath, "utf8");
}

function configuredAppleApi(env) {
  const keyId = envValue(env, "APP_STORE_CONNECT_API_KEY_ID");
  const issuerId = envValue(env, "APP_STORE_CONNECT_API_ISSUER_ID");
  const privateKeyPath = envValue(env, "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH");
  if (!keyId || !issuerId || !privateKeyPath) {
    return { configured: false };
  }
  return { configured: true, keyId, issuerId, privateKeyPath };
}

function configuredGooglePlayApi(env) {
  const serviceAccountJson = envValue(env, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  const credentialsPath = envValue(env, "GOOGLE_APPLICATION_CREDENTIALS");
  if (!serviceAccountJson && !credentialsPath) {
    return { configured: false };
  }
  return { configured: true, serviceAccountJson, credentialsPath };
}

async function fetchJson(url, options, label) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
  return response.json();
}

function buildAppStoreConnectJwt(config) {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = readPrivateKeyFile(config.privateKeyPath);
  return signJwt({
    algorithm: "SHA256",
    dsaEncoding: "ieee-p1363",
    privateKey,
    header: {
      alg: "ES256",
      kid: config.keyId,
      typ: "JWT",
    },
    payload: {
      iss: config.issuerId,
      aud: "appstoreconnect-v1",
      iat: now,
      exp: now + 15 * 60,
    },
  });
}

async function checkAppStoreConnectApi(env) {
  const config = configuredAppleApi(env);
  if (!config.configured) {
    return { status: "skipped", label: "App Store Connect API", reason: "credentials missing" };
  }

  const bundleId = envValue(env, "APP_STORE_CONNECT_BUNDLE_ID") || defaultBundleId;
  const buildVersion = envValue(env, "APP_STORE_CONNECT_BUILD_VERSION") || defaultIosBuild;
  const token = buildAppStoreConnectJwt(config);
  const authorization = { Authorization: `Bearer ${token}` };
  const appQuery = new URLSearchParams({
    "filter[bundleId]": bundleId,
    "fields[apps]": "bundleId,name",
    limit: "1",
  });
  const apps = await fetchJson(
    `${appStoreConnectApiBaseUrl}/v1/apps?${appQuery}`,
    { headers: authorization },
    "App Store Connect apps lookup",
  );
  const app = apps.data?.[0];
  if (!app?.id) {
    return { status: "fail", label: "App Store Connect API", reason: "app record not found" };
  }

  const buildQuery = new URLSearchParams({
    "fields[builds]": "version,processingState,expired,uploadedDate",
    limit: "200",
  });
  const builds = await fetchJson(
    `${appStoreConnectApiBaseUrl}/v1/apps/${encodeURIComponent(app.id)}/builds?${buildQuery}`,
    { headers: authorization },
    "App Store Connect builds lookup",
  );
  const build = (builds.data ?? []).find((item) => item?.attributes?.version === buildVersion);
  const buildState = build?.attributes?.processingState;
  if (!build) {
    return { status: "fail", label: "App Store Connect API", reason: "target build not found" };
  }
  if (build.attributes?.expired === true) {
    return { status: "fail", label: "App Store Connect API", reason: "target build is expired" };
  }
  if (buildState !== "VALID") {
    return {
      status: "fail",
      label: "App Store Connect API",
      reason: `target build is not processed (${buildState ?? "unknown"})`,
    };
  }

  const groups = await fetchJson(
    `${appStoreConnectApiBaseUrl}/v1/apps/${encodeURIComponent(app.id)}/betaGroups?fields[betaGroups]=name,isInternalGroup,hasAccessToAllBuilds&limit=200`,
    { headers: authorization },
    "App Store Connect beta groups lookup",
  );
  const hasInternalGroup = (groups.data ?? []).some((group) => {
    const attributes = group?.attributes ?? {};
    return attributes.isInternalGroup === true || attributes.hasAccessToAllBuilds === true;
  });
  if (!hasInternalGroup) {
    return {
      status: "fail",
      label: "App Store Connect API",
      reason: "no internal TestFlight beta group was found",
    };
  }

  return {
    status: "pass",
    label: "App Store Connect API",
    detail: `build ${buildVersion} is VALID and an internal TestFlight group exists`,
  };
}

function readGoogleServiceAccount(env, config) {
  const rawJson = config.serviceAccountJson
    ? config.serviceAccountJson
    : readPrivateKeyFile(config.credentialsPath);
  const parsed = JSON.parse(rawJson);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("service account JSON is missing required fields");
  }
  return parsed;
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    privateKey: serviceAccount.private_key,
    header: {
      alg: "RS256",
      typ: "JWT",
    },
    payload: {
      iss: serviceAccount.client_email,
      scope: androidPublisherScope,
      aud: serviceAccount.token_uri || googleTokenUrl,
      iat: now,
      exp: now + 60 * 60,
    },
  });
  const response = await fetch(serviceAccount.token_uri || googleTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google OAuth token exchange: HTTP ${response.status}`);
  }
  const json = await response.json();
  if (!json.access_token) {
    throw new Error("Google OAuth token response did not include an access token");
  }
  return json.access_token;
}

async function googlePublisherJson({ packageName, pathSuffix, accessToken, method = "GET", body }) {
  const url = `${googleAndroidPublisherBaseUrl}/applications/${encodeURIComponent(packageName)}${pathSuffix}`;
  return fetchJson(
    url,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    `Google Play Developer API ${method} ${pathSuffix.split("?")[0]}`,
  );
}

async function checkGooglePlayApi(env) {
  const config = configuredGooglePlayApi(env);
  if (!config.configured) {
    return { status: "skipped", label: "Google Play Developer API", reason: "credentials missing" };
  }

  const packageName = envValue(env, "GOOGLE_PLAY_PACKAGE_NAME") || defaultBundleId;
  const targetVersionCode = envValue(env, "GOOGLE_PLAY_VERSION_CODE") || defaultAndroidVersionCode;
  const trackName = envValue(env, "GOOGLE_PLAY_TRACK") || defaultPlayTrack;
  const serviceAccount = readGoogleServiceAccount(env, config);
  const accessToken = await getGoogleAccessToken(serviceAccount);
  let editId = "";

  try {
    const edit = await googlePublisherJson({
      packageName,
      accessToken,
      method: "POST",
      pathSuffix: "/edits",
      body: {},
    });
    editId = edit.id;
    if (!editId) {
      return { status: "fail", label: "Google Play Developer API", reason: "edit id missing" };
    }

    const track = await googlePublisherJson({
      packageName,
      accessToken,
      pathSuffix: `/edits/${encodeURIComponent(editId)}/tracks/${encodeURIComponent(trackName)}`,
    });
    const matchingRelease = (track.releases ?? []).find((release) =>
      (release.versionCodes ?? []).map(String).includes(targetVersionCode),
    );
    if (!matchingRelease) {
      return {
        status: "fail",
        label: "Google Play Developer API",
        reason: `track ${trackName} does not include versionCode ${targetVersionCode}`,
      };
    }
    if (matchingRelease.status === "draft") {
      return {
        status: "fail",
        label: "Google Play Developer API",
        reason: `track ${trackName} release is still draft`,
      };
    }

    return {
      status: "pass",
      label: "Google Play Developer API",
      detail: `track ${trackName} includes versionCode ${targetVersionCode}`,
    };
  } finally {
    if (editId) {
      await fetch(
        `${googleAndroidPublisherBaseUrl}/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      ).catch(() => {});
    }
  }
}

async function runApiChecks(env) {
  const results = [];
  for (const check of [checkAppStoreConnectApi, checkGooglePlayApi]) {
    try {
      results.push(await check(env));
    } catch (error) {
      results.push({
        status: "fail",
        label: check === checkAppStoreConnectApi ? "App Store Connect API" : "Google Play Developer API",
        reason: error instanceof Error ? error.message : "unknown API error",
      });
    }
  }
  return results;
}

function matchingApiResult(apiResults, itemLabel) {
  if (itemLabel === "App Store Connect/TestFlight") {
    return apiResults.find((result) => result.label === "App Store Connect API");
  }
  if (itemLabel === "Google Play Console internal testing") {
    return apiResults.find((result) => result.label === "Google Play Developer API");
  }
  return undefined;
}

async function run() {
  if (!existsSync(evidencePath)) {
    console.error("Store console confirmation check failed: docs/store-console-confirmation.md is missing");
    process.exit(1);
  }

  const evidence = readFileSync(evidencePath, "utf8");
  const env = readConfiguredEnv();
  const configuredEnvNames = readConfiguredEnvNames();
  const missingApiCredentials = missingApiCredentialGroups(configuredEnvNames);
  const apiResults = await runApiChecks(env);
  const failures = [];
  const passes = [];

  for (const item of requiredEvidence) {
    if (includesAll(evidence, item.terms)) {
      const missingExtra = missingExtraEvidence(evidence, item);
      if (missingExtra.length === 0) {
        passes.push(item.label);
      } else {
        failures.push({ label: item.label, missing: missingExtra });
      }
    } else {
      const apiResult = matchingApiResult(apiResults, item.label);
      if (apiResult?.status === "pass") {
        passes.push(`${item.label}: ${apiResult.detail}`);
      } else {
        const missing = item.terms.filter((term) => !evidence.includes(term));
        if (apiResult?.status === "fail") {
          missing.push(`${apiResult.label}: ${apiResult.reason}`);
        }
        failures.push({ label: item.label, missing });
      }
    }
  }

  console.log("Store console confirmation check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Failures: ${failures.length}`);

  if (passes.length > 0) {
    console.log("\nPASS");
    for (const pass of passes) {
      console.log(`- ${pass}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFAIL");
    for (const failure of failures) {
      console.log(`- ${failure.label}: missing confirmation evidence`);
      for (const term of failure.missing) {
        console.log(`  - ${term}`);
      }
    }

    if (missingApiCredentials.length > 0) {
      console.log("\nHINT");
      console.log("- Browser confirmation is still required unless store API credentials are configured.");
      for (const item of missingApiCredentials) {
        console.log(`- ${item.label}: missing ${item.missing.join(", ")}`);
      }
    }

    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Store console confirmation check failed");
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
