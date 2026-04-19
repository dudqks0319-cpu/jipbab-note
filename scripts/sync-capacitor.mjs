// 이 파일은 모바일 배포 전에 CAPACITOR_SERVER_URL을 읽어 cap sync를 안전하게 실행합니다.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function readEnvFile(envFilePath) {
  if (!existsSync(envFilePath)) {
    return {};
  }

  const content = readFileSync(envFilePath, "utf8");
  const pairs = {};

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

const platform = process.argv[2] ?? "ios";
const cwd = process.cwd();
const envFromFile = readEnvFile(path.join(cwd, ".env.local"));
const env = {
  ...process.env,
  ...envFromFile,
};

const serverUrl = env.CAPACITOR_SERVER_URL?.trim() ?? "";
const allowPlaceholder = env.CAPACITOR_ALLOW_PLACEHOLDER === "1";

if (!serverUrl && !allowPlaceholder) {
  console.error(
    "CAPACITOR_SERVER_URL이 비어 있어 모바일 앱에 placeholder 화면만 포함됩니다. .env.local 또는 셸 환경변수에 실제 공개 URL을 넣어주세요.",
  );
  process.exit(1);
}

if (serverUrl && !serverUrl.startsWith("https://") && !serverUrl.startsWith("http://localhost")) {
  console.error("CAPACITOR_SERVER_URL은 HTTPS 공개 URL 또는 localhost여야 합니다.");
  process.exit(1);
}

if (serverUrl) {
  env.CAPACITOR_SERVER_URL = serverUrl;
  console.log(`Using CAPACITOR_SERVER_URL=${serverUrl}`);
} else {
  console.log("Using placeholder web bundle for Capacitor sync.");
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["cap", "sync", platform], {
  cwd,
  env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
