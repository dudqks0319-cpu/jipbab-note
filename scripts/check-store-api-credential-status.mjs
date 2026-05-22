import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envPaths = [
  path.join(cwd, ".env.local"),
  path.join(cwd, ".env.android-signing.local"),
  path.join(cwd, ".env.store-api.local"),
];
const releaseSecretsDir = path.join(cwd, ".release-secrets");
const appStoreConnectRequired = [
  "APP_STORE_CONNECT_API_KEY_ID",
  "APP_STORE_CONNECT_API_ISSUER_ID",
  "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH",
];
const googlePathEnv = "GOOGLE_APPLICATION_CREDENTIALS";
const googleJsonEnv = "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON";

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
  return typeof env[key] === "string" ? env[key].trim() : "";
}

function resolveLocalPath(value) {
  return path.isAbsolute(value) ? value : path.join(cwd, value);
}

function maskedLocalPath(filePath) {
  const relative = path.relative(cwd, filePath);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    const parts = relative.split(path.sep);
    if (parts[0] === ".release-secrets" && parts.length > 1) {
      return ".release-secrets/[redacted-file]";
    }
    return relative;
  }
  return "[outside-workspace]";
}

function gitIgnored(filePath) {
  const result = spawnSync("git", ["check-ignore", "-q", filePath], {
    cwd,
    encoding: "utf8",
  });
  return result.status === 0;
}

function restrictedFileMode(filePath) {
  const mode = statSync(filePath).mode & 0o777;
  return (mode & 0o077) === 0;
}

function listLocalSecretFiles(extension) {
  if (!existsSync(releaseSecretsDir)) {
    return [];
  }
  return readdirSync(releaseSecretsDir)
    .filter((name) => name.endsWith(extension))
    .map((name) => path.join(releaseSecretsDir, name));
}

function describeP8Candidate(filePath) {
  const basename = path.basename(filePath);
  if (/apple-auth-key/i.test(basename)) {
    return "looks like a Sign in with Apple OAuth key, not an App Store Connect API key";
  }
  if (/^AuthKey_[A-Z0-9]+\.p8$/i.test(basename)) {
    return "uses the standard App Store Connect API key filename shape";
  }
  return "filename does not use the standard AuthKey_<KEY_ID>.p8 App Store Connect API shape";
}

function appStoreKeyFilenameMatchesKeyId(filePath, keyId) {
  const basename = path.basename(filePath).toLowerCase();
  return basename.includes(keyId.toLowerCase());
}

function checkPrivateKeyFile(rawPath) {
  const filePath = resolveLocalPath(rawPath);
  const details = [];
  const failures = [];

  if (!existsSync(filePath)) {
    failures.push("private key file is missing");
    return { details, failures };
  }

  details.push(`private key path exists at ${maskedLocalPath(filePath)}`);
  details.push(`private key filename check: ${describeP8Candidate(filePath)}`);
  if (gitIgnored(filePath)) {
    details.push("private key path is ignored by git");
  } else {
    failures.push("private key path is not ignored by git");
  }

  if (restrictedFileMode(filePath)) {
    details.push("private key file mode is restricted");
  } else {
    failures.push("private key file mode is readable by group/other");
  }

  const content = readFileSync(filePath, "utf8");
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) {
    details.push("private key file has a PEM private-key header");
  } else {
    failures.push("private key file does not look like a PEM private key");
  }

  return { details, failures };
}

function parseGoogleServiceAccount(rawJson) {
  const parsed = JSON.parse(rawJson);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("service account JSON is not an object");
  }
  if (typeof parsed.client_email !== "string" || !parsed.client_email) {
    throw new Error("service account JSON is missing client_email");
  }
  if (typeof parsed.private_key !== "string" || !parsed.private_key) {
    throw new Error("service account JSON is missing private_key");
  }
}

function checkGoogleCredentials(env) {
  const pathValue = envValue(env, googlePathEnv);
  const jsonValue = envValue(env, googleJsonEnv);
  const details = [];
  const failures = [];

  if (!pathValue && !jsonValue) {
    return {
      status: "blocked",
      details: [`missing one of ${googlePathEnv}, ${googleJsonEnv}`],
      failures,
    };
  }

  if (jsonValue) {
    try {
      parseGoogleServiceAccount(jsonValue);
      details.push(`${googleJsonEnv} is configured and has required service-account fields`);
      details.push("warning: path-based GOOGLE_APPLICATION_CREDENTIALS is safer for local handling");
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "invalid service account JSON");
    }
  }

  if (pathValue) {
    const filePath = resolveLocalPath(pathValue);
    if (!existsSync(filePath)) {
      failures.push("service account JSON file is missing");
    } else {
      details.push(`service account path exists at ${maskedLocalPath(filePath)}`);
      if (gitIgnored(filePath)) {
        details.push("service account path is ignored by git");
      } else {
        failures.push("service account path is not ignored by git");
      }

      if (restrictedFileMode(filePath)) {
        details.push("service account file mode is restricted");
      } else {
        failures.push("service account file mode is readable by group/other");
      }

      try {
        parseGoogleServiceAccount(readFileSync(filePath, "utf8"));
        details.push("service account JSON file has required fields");
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "invalid service account JSON file");
      }
    }
  }

  return {
    status: failures.length > 0 ? "fail" : "ready",
    details,
    failures,
  };
}

function checkAppStoreConnectCredentials(env) {
  const present = appStoreConnectRequired.filter((name) => envValue(env, name));
  const missing = appStoreConnectRequired.filter((name) => !envValue(env, name));
  const details = [];
  const failures = [];

  if (present.length !== appStoreConnectRequired.length) {
    details.push(`missing ${missing.join(", ")}`);
    const localP8Count = listLocalSecretFiles(".p8").length;
    if (localP8Count > 0) {
      details.push(
        `${localP8Count} local .p8 file(s) exist under .release-secrets, but they are not wired as App Store Connect API credentials`,
      );
      for (const candidatePath of listLocalSecretFiles(".p8")) {
        details.push(`local .p8 candidate: ${describeP8Candidate(candidatePath)}`);
      }
      details.push("verify the file was created in App Store Connect Users and Access before wiring it");
    }
    return { status: "blocked", details, failures };
  }

  const keyCheck = checkPrivateKeyFile(envValue(env, "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH"));
  details.push(`${present.length} required App Store Connect API env names are configured`);
  if (appStoreKeyFilenameMatchesKeyId(envValue(env, "APP_STORE_CONNECT_API_PRIVATE_KEY_PATH"), envValue(env, "APP_STORE_CONNECT_API_KEY_ID"))) {
    details.push("private key filename includes the configured App Store Connect key id");
  } else {
    details.push("private key filename does not include the configured App Store Connect key id; verify it was not confused with an Apple OAuth key");
  }
  details.push(...keyCheck.details);
  failures.push(...keyCheck.failures);

  return {
    status: failures.length > 0 ? "fail" : "ready",
    details,
    failures,
  };
}

function printSection(label, result) {
  console.log(`${result.status.toUpperCase()}: ${label}`);
  for (const detail of result.details) {
    console.log(`- ${detail}`);
  }
  for (const failure of result.failures) {
    console.log(`- ${failure}`);
  }
  console.log("");
}

function run() {
  const env = readConfiguredEnv();
  const appStore = checkAppStoreConnectCredentials(env);
  const googlePlay = checkGoogleCredentials(env);
  const results = [
    ["App Store Connect API credentials", appStore],
    ["Google Play Developer API credentials", googlePlay],
  ];
  const ready = results.filter(([, result]) => result.status === "ready").length;
  const blocked = results.filter(([, result]) => result.status === "blocked").length;
  const failures = results.filter(([, result]) => result.status === "fail").length;

  console.log("Store API credential status");
  console.log(`Ready: ${ready}`);
  console.log(`Blocked: ${blocked}`);
  console.log(`Security failures: ${failures}`);
  console.log("");
  for (const [label, result] of results) {
    printSection(label, result);
  }

  if (failures > 0) {
    process.exit(1);
  }
}

run();
