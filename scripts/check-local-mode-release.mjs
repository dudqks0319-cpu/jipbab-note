// 이 파일은 Supabase 지연/빈 응답 상황에서도 로컬모드 데이터가 보존되는지 검증합니다.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", "tests/local-mode-release.test.ts"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Local mode release check failed to start: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
