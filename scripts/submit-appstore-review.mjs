import { createSign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPaths = [
  path.join(cwd, ".env.local"),
  path.join(cwd, ".env.android-signing.local"),
  path.join(cwd, ".env.store-api.local"),
];
const iosProjectPath = path.join(cwd, "ios/App/App.xcodeproj/project.pbxproj");
const appStoreConnectApiBaseUrl = "https://api.appstoreconnect.apple.com";
const defaultBundleId = "com.jipbab.note";
const submit = process.argv.includes("--submit");
const attachBuild = process.argv.includes("--attach-build");
const listBuilds = process.argv.includes("--list-builds");

function readIosProjectSetting(name) {
  if (!existsSync(iosProjectPath)) {
    return null;
  }
  const source = readFileSync(iosProjectPath, "utf8");
  const match = source.match(new RegExp(`${name}\\s*=\\s*([^;]+);`));
  return match?.[1]?.trim().replace(/^"|"$/g, "") ?? null;
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

function findIncludedBuild(json) {
  return (json.included ?? []).find((item) => item.type === "builds");
}

async function findTargetBuild({ appId, buildVersion, token }) {
  const buildQuery = new URLSearchParams({
    "fields[builds]": "version,processingState,expired,uploadedDate",
    limit: "200",
  });
  const builds = await requestJson({
    pathSuffix: `/v1/apps/${encodeURIComponent(appId)}/builds?${buildQuery}`,
    token,
    label: "App Store Connect builds lookup",
  });
  return (builds.data ?? []).find((item) => item?.attributes?.version === buildVersion) ?? null;
}

async function listAppBuilds({ appId, token }) {
  const buildQuery = new URLSearchParams({
    "fields[builds]": "version,processingState,expired,uploadedDate",
    limit: "200",
  });
  return requestJson({
    pathSuffix: `/v1/apps/${encodeURIComponent(appId)}/builds?${buildQuery}`,
    token,
    label: "App Store Connect builds lookup",
  });
}

async function optionalRequestJson(args) {
  try {
    return await requestJson(args);
  } catch {
    return {};
  }
}

async function fetchAppStoreVersion({ appId, versionString, token }) {
  const versionQuery = new URLSearchParams({
    "filter[platform]": "IOS",
    "filter[versionString]": versionString,
    "fields[appStoreVersions]": "versionString,appStoreState,platform,createdDate",
    "fields[builds]": "version,processingState,expired,uploadedDate",
    include: "build",
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
  return { versions, appStoreVersion, build: findIncludedBuild(versions) };
}

async function attachBuildToVersion({ appStoreVersionId, buildId, token }) {
  await requestJson({
    pathSuffix: `/v1/appStoreVersions/${encodeURIComponent(appStoreVersionId)}/relationships/build`,
    token,
    method: "PATCH",
    body: {
      data: {
        type: "builds",
        id: buildId,
      },
    },
    label: "Attach build to App Store version",
  });
}

function submissionBody(appStoreVersionId) {
  return {
    data: {
      type: "appStoreVersionSubmissions",
      relationships: {
        appStoreVersion: {
          data: {
            type: "appStoreVersions",
            id: appStoreVersionId,
          },
        },
      },
    },
  };
}

function evidenceSummary({ app, appStoreVersion, build, submissionResult, mode }) {
  const lines = [
    "# App Store Review Submission Evidence",
    "",
    `- Date: ${new Date().toISOString()}`,
    `- Mode: ${mode}`,
    "- Platform: App Store / iOS only",
    `- App name: ${app.attributes?.name ?? "unknown"}`,
    `- Bundle ID: ${app.attributes?.bundleId ?? "unknown"}`,
    `- App Store version: ${appStoreVersion.attributes?.versionString ?? "unknown"}`,
    `- App Store version state: ${appStoreVersion.attributes?.appStoreState ?? "unknown"}`,
    `- App Store version id: ${appStoreVersion.id}`,
    `- Build version: ${build?.attributes?.version ?? "not included"}`,
    `- Build processing state: ${build?.attributes?.processingState ?? "not included"}`,
    `- Build id: ${build?.id ?? "not included"}`,
    `- Submission id: ${submissionResult?.data?.id ?? "not submitted"}`,
    `- Submission type: ${submissionResult?.data?.type ?? "not submitted"}`,
    "",
    "## Commands",
    "",
    "- `pnpm release:store-api-credential-status`",
    "- `pnpm release:appstore-submit-gate`",
    `- \`node scripts/submit-appstore-review.mjs${mode === "submitted" ? " --submit" : ""}\``,
    "",
    "## Notes",
    "",
    "- No Google Play submission was attempted.",
    "- API credentials and private-key contents were not printed or saved.",
  ];
  return `${lines.join("\n")}\n`;
}

async function run() {
  const env = readConfiguredEnv();
  const bundleId = envValue(env, "APP_STORE_CONNECT_BUNDLE_ID") || defaultBundleId;
  const buildVersion =
    envValue(env, "APP_STORE_CONNECT_BUILD_VERSION") ||
    readIosProjectSetting("CURRENT_PROJECT_VERSION") ||
    "";
  const versionString =
    envValue(env, "APP_STORE_CONNECT_VERSION_STRING") ||
    readIosProjectSetting("MARKETING_VERSION") ||
    "";
  if (!buildVersion || !versionString) {
    throw new Error("Could not determine target iOS build number and marketing version");
  }

  const token = buildAppStoreConnectJwt(env);
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

  if (listBuilds) {
    const builds = await listAppBuilds({ appId: app.id, token });
    console.log("App Store Connect builds");
    for (const build of builds.data ?? []) {
      const [preReleaseVersion, buildBetaDetail] = await Promise.all([
        optionalRequestJson({
          pathSuffix: `/v1/builds/${encodeURIComponent(build.id)}/preReleaseVersion`,
          token,
          label: `Build ${build.attributes?.version ?? build.id} preReleaseVersion`,
        }),
        optionalRequestJson({
          pathSuffix: `/v1/builds/${encodeURIComponent(build.id)}/buildBetaDetail`,
          token,
          label: `Build ${build.attributes?.version ?? build.id} buildBetaDetail`,
        }),
      ]);
      console.log(
        [
          `- build=${build.attributes?.version ?? "unknown"}`,
          `id=${build.id}`,
          `processing=${build.attributes?.processingState ?? "unknown"}`,
          `expired=${build.attributes?.expired === true ? "true" : "false"}`,
          `uploaded=${build.attributes?.uploadedDate ?? "unknown"}`,
          `train=${preReleaseVersion?.data?.attributes?.version ?? "unknown"}`,
          `internal=${buildBetaDetail?.data?.attributes?.internalBuildState ?? "unknown"}`,
          `external=${buildBetaDetail?.data?.attributes?.externalBuildState ?? "unknown"}`,
        ].join(" "),
      );
    }
    return;
  }

  let { appStoreVersion, build } = await fetchAppStoreVersion({
    appId: app.id,
    versionString,
    token,
  });
  if (!appStoreVersion?.id) {
    throw new Error(`App Store version ${versionString} for iOS was not found`);
  }

  const targetBuild = await findTargetBuild({ appId: app.id, buildVersion, token });
  if (!targetBuild?.id) {
    throw new Error(`Target build ${buildVersion} was not found in App Store Connect`);
  }
  if (targetBuild.attributes?.processingState !== "VALID") {
    throw new Error(`Target build ${buildVersion} is not VALID (${targetBuild.attributes?.processingState ?? "unknown"})`);
  }
  if (targetBuild.attributes?.expired === true) {
    throw new Error(`Target build ${buildVersion} is expired`);
  }

  if (attachBuild && build?.id !== targetBuild.id) {
    await attachBuildToVersion({
      appStoreVersionId: appStoreVersion.id,
      buildId: targetBuild.id,
      token,
    });
    ({ appStoreVersion, build } = await fetchAppStoreVersion({
      appId: app.id,
      versionString,
      token,
    }));
  }

  if (buildVersion && build?.attributes?.version && build.attributes.version !== buildVersion) {
    throw new Error(
      `App Store version ${versionString} is attached to build ${build.attributes.version}, not target build ${buildVersion}`,
    );
  }
  if (build?.attributes?.processingState && build.attributes.processingState !== "VALID") {
    throw new Error(`Attached build is not VALID (${build.attributes.processingState})`);
  }
  if (build?.attributes?.expired === true) {
    throw new Error("Attached build is expired");
  }

  let submissionResult = null;
  if (submit) {
    submissionResult = await requestJson({
      pathSuffix: "/v1/appStoreVersionSubmissions",
      token,
      method: "POST",
      body: submissionBody(appStoreVersion.id),
      label: "Create App Store version submission",
    });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(
    cwd,
    "output",
    "release-evidence",
    `${stamp}-appstore-review-${submit ? "submitted" : "preflight"}`,
  );
  mkdirSync(outDir, { recursive: true });
  const summary = evidenceSummary({
    app,
    appStoreVersion,
    build,
    submissionResult,
    mode: submit ? "submitted" : "preflight",
  });
  writeFileSync(path.join(outDir, "summary.md"), summary);

  console.log("App Store review submission");
  console.log(`Mode: ${submit ? "submitted" : "preflight"}`);
  console.log(`Bundle ID: ${bundleId}`);
  console.log(`Version: ${versionString}`);
  console.log(`Build: ${build?.attributes?.version ?? "not included"}`);
  console.log(`Target build id: ${targetBuild.id}`);
  console.log(`App Store version state: ${appStoreVersion.attributes?.appStoreState ?? "unknown"}`);
  if (submissionResult?.data?.id) {
    console.log(`Submission id: ${submissionResult.data.id}`);
  }
  console.log(`Evidence: ${path.relative(cwd, path.join(outDir, "summary.md"))}`);
  if (!submit) {
    console.log(
      `Dry run only. Re-run with --attach-build to attach build ${buildVersion}, or --submit to create the App Store version submission.`,
    );
  }
}

run().catch((error) => {
  console.error("App Store review submission failed");
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
