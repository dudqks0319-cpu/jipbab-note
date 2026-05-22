// 이 파일은 냉장고 -> 레시피 추천 -> 장보기 -> 구매 후 냉장고 반영 핵심 루프를 검증합니다.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", "tests/core-loop-release.test.ts"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Core loop release check failed to start: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
