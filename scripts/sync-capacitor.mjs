// 이 파일은 모바일 배포 전에 CAPACITOR_SERVER_URL을 읽어 cap sync를 안전하게 실행합니다.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  ...envFromFile,
  ...process.env,
};
const APP_MARKERS = ["집밥노트", "JIPBAB NOTE", "TODAY'S KITCHEN"];
const runtimeConfigPath = path.join(cwd, "public", "runtime-app-config.json");

async function verifyAppUrl(serverUrl) {
  try {
    const response = await fetch(serverUrl, {
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const matchedMarker = APP_MARKERS.find((marker) => html.includes(marker));

    if (!matchedMarker) {
      throw new Error("집밥노트 앱 마커를 찾지 못했습니다.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(
      `CAPACITOR_SERVER_URL 검증 실패: ${serverUrl}\n- 이유: ${message}\n- 다른 앱 또는 잘못된 서버를 바라보는 상태일 수 있습니다.`,
    );
    process.exit(1);
  }
}

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
  await verifyAppUrl(serverUrl);
  writeFileSync(
    runtimeConfigPath,
    JSON.stringify(
      {
        remoteUrl: serverUrl,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  env.CAPACITOR_SERVER_URL = serverUrl;
  console.log(`Using CAPACITOR_SERVER_URL=${serverUrl}`);
} else {
  writeFileSync(
    runtimeConfigPath,
    JSON.stringify(
      {
        remoteUrl: "",
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log("Using placeholder web bundle for Capacitor sync.");
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["cap", "sync", platform], {
  cwd,
  env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
