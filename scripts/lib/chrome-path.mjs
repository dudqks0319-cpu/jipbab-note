// 이 파일은 로컬과 CI에서 사용할 Chrome 실행 파일을 플랫폼별로 탐색합니다.
import { existsSync } from "node:fs";

const CANDIDATES = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

/**
 * @param {{explicitPath?: string | null, platform?: string, exists?: (candidate: string) => boolean}} [options]
 * @returns {string}
 */
export function resolveChromeExecutable({
  explicitPath = process.env.CHROME_PATH?.trim() || null,
  platform = process.platform,
  exists = (candidate) => existsSync(candidate),
} = {}) {
  const attempted = [...(explicitPath ? [explicitPath] : []), ...(CANDIDATES[platform] ?? [])];
  const resolved = attempted.find((candidate) => exists(candidate));
  if (resolved) return resolved;
  throw new Error(
    `Chrome 실행 파일을 찾지 못했습니다. CHROME_PATH를 지정해 주세요. 확인한 경로: ${attempted.join(", ") || "없음"}`,
  );
}
