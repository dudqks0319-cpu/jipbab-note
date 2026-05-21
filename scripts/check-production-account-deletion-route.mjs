import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFilePath = path.join(cwd, ".env.local");
const DEFAULT_PRODUCTION_URL = "https://jipbab-note-app.vercel.app";
const ACCOUNT_DELETION_PATH = "/api/account-deletion-requests";
const EXPECTED_FORBIDDEN_MESSAGE = "운영자 권한이 없습니다.";
const EXPECTED_SERVICE_UNAVAILABLE_MESSAGE =
  "계정 삭제 운영 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.";

const sensitiveOutputPatterns = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /ADMIN_EMAILS/i,
  /NEXT_PUBLIC_SUPABASE_(URL|ANON_KEY)/i,
  /service[_-]?role/i,
  /환경변수가 설정되어 있지 않습니다/i,
  /stack/i,
  /trace/i,
];

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const pairs = {};
  const content = readFileSync(filePath, "utf8");
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
    pairs[key] = value;
  }

  return pairs;
}

function normalizeBaseUrl(value) {
  const raw = value?.trim() || DEFAULT_PRODUCTION_URL;
  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("production app URL must use HTTPS");
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function parseJson(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getMessage(json) {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return "";
  }
  return typeof json.message === "string" ? json.message : "";
}

function hasSensitiveOutput(text) {
  return sensitiveOutputPatterns.some((pattern) => pattern.test(text));
}

function hasNoStore(headers) {
  return /\bno-store\b/i.test(headers.get("cache-control") ?? "");
}

function printResult({ status, passes, failures, details }) {
  console.log("Production account deletion route check");
  console.log(`Status: ${status}`);
  console.log(`Passes: ${passes}`);
  console.log(`Failures: ${failures}`);
  console.log("");
  for (const detail of details) {
    console.log(detail);
  }
}

async function run() {
  const env = {
    ...readEnvFile(envFilePath),
    ...process.env,
  };
  const productionUrl = normalizeBaseUrl(env.PRODUCTION_APP_URL || env.CAPACITOR_SERVER_URL);
  const response = await fetch(`${productionUrl}${ACCOUNT_DELETION_PATH}`, {
    headers: {
      Accept: "application/json",
    },
  });
  const text = await response.text();
  const json = parseJson(text);
  const message = getMessage(json);
  const details = [];
  let passes = 0;

  if (hasNoStore(response.headers)) {
    passes += 1;
    details.push("- no-store cache header is present");
  } else {
    printResult({
      status: "fail",
      passes,
      failures: 1,
      details: ["FAIL", "- missing Cache-Control: no-store on privileged route"],
    });
    process.exit(1);
  }

  if (hasSensitiveOutput(text)) {
    printResult({
      status: "fail",
      passes,
      failures: 1,
      details: ["FAIL", "- response body contains sensitive implementation details"],
    });
    process.exit(1);
  }
  passes += 1;
  details.push("- response body does not expose server env names or internal traces");

  if (response.status === 403 && message === EXPECTED_FORBIDDEN_MESSAGE) {
    passes += 1;
    details.push("- unauthenticated admin listing is forbidden");
    printResult({ status: "pass", passes, failures: 0, details: ["PASS", ...details] });
    return;
  }

  if (response.status === 503 && message === EXPECTED_SERVICE_UNAVAILABLE_MESSAGE) {
    details.push("- route fails closed with a generic 503 because production admin env is incomplete");
    printResult({
      status: "blocked",
      passes,
      failures: 1,
      details: [
        "FAIL",
        ...details,
        "- next: add SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAILS to Vercel Production, redeploy, then rerun this check",
      ],
    });
    process.exit(1);
  }

  if (response.status === 200) {
    printResult({
      status: "fail",
      passes,
      failures: 1,
      details: ["FAIL", "- unauthenticated account-deletion admin listing returned HTTP 200"],
    });
    process.exit(1);
  }

  printResult({
    status: "fail",
    passes,
    failures: 1,
    details: [
      "FAIL",
      `- unexpected response: HTTP ${response.status}${message ? ` message=${message}` : ""}`,
    ],
  });
  process.exit(1);
}

run().catch((error) => {
  console.error("Production account deletion route check");
  console.error("Status: fail");
  console.error("Passes: 0");
  console.error("Failures: 1");
  console.error("");
  console.error(`FAIL\n- ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
});
