import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 기존 데이터 로딩 훅은 effect에서 명시적으로 비동기 조회를 시작합니다.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Native build artifacts (generated)
    "android/.gradle/**",
    "android/build/**",
    "android/**/build/**",
  ]),
]);

export default eslintConfig;
