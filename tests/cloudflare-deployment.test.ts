import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("Cloudflare OpenNext scripts and dependencies are configured", () => {
  assert.equal(packageJson.scripts["check:cloudflare-config"], "node scripts/check-cloudflare-config.mjs");
  assert.equal(packageJson.scripts.preview, "opennextjs-cloudflare build && opennextjs-cloudflare preview");
  assert.equal(packageJson.scripts.deploy, "opennextjs-cloudflare build && opennextjs-cloudflare deploy");
  assert.equal(packageJson.scripts["cf-typegen"], "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts");
  assert.equal(packageJson.scripts["cloudflare:build"], "opennextjs-cloudflare build");
  assert.equal(packageJson.scripts["cloudflare:preview"], "opennextjs-cloudflare preview");
  assert.equal(packageJson.scripts["cloudflare:deploy"], "opennextjs-cloudflare build && opennextjs-cloudflare deploy");
  assert.equal(packageJson.scripts["check:cloudflare-live-home"], "node scripts/check-cloudflare-live-home.mjs");
  assert.equal(
    packageJson.scripts["release:cloudflare-external-check"],
    "node scripts/check-cloudflare-external-release.mjs",
  );
  assert.match(packageJson.devDependencies["@opennextjs/cloudflare"], /^\^?\d+\./);
  assert.match(packageJson.devDependencies.wrangler, /^\^?\d+\./);
});

test("Cloudflare worker config avoids hardcoded Supabase/admin secrets", () => {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");

  assert.match(wrangler, /"name": "jipbab-note-app"/);
  assert.match(wrangler, /"main": ".open-next\/worker\.js"/);
  assert.match(wrangler, /"nodejs_compat"/);
  assert.match(wrangler, /"global_fetch_strictly_public"/);
  assert.match(wrangler, /"directory": ".open-next\/assets"/);
  assert.match(wrangler, /"run_worker_first": true/);
  assert.match(wrangler, /"WORKER_SELF_REFERENCE"/);
  assert.doesNotMatch(wrangler, /"secrets"\s*:\s*\{/);
  assert.doesNotMatch(wrangler, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]/);
  assert.doesNotMatch(wrangler, /ADMIN_EMAILS\s*[:=]/);
  assert.doesNotMatch(wrangler, /NEXT_PUBLIC_SUPABASE_ANON_KEY\s*[:=]\s*["'][A-Za-z0-9_.-]{20,}/);
});

test("OpenNext Cloudflare config stays free-tier friendly for the first candidate", () => {
  const openNext = readFileSync("open-next.config.ts", "utf8");

  assert.match(openNext, /defineCloudflareConfig/);
  assert.match(openNext, /incrementalCache: "dummy"/);
  assert.match(openNext, /tagCache: "dummy"/);
  assert.match(openNext, /queue: "dummy"/);
  assert.doesNotMatch(openNext, /r2IncrementalCache|kvIncrementalCache/);
});

test("Cloudflare deployment runbook covers OAuth, mobile sync, and affiliate disclosure", () => {
  const docs = readFileSync("docs/cloudflare-deployment.md", "utf8");

  assert.match(docs, /CAPACITOR_SERVER_URL/);
  assert.match(docs, /com\.jipbab\.note:\/\/auth\/callback/);
  assert.match(docs, /pnpm cloudflare:build/);
  assert.match(docs, /pnpm cloudflare:deploy/);
  assert.match(docs, /run_worker_first/);
  assert.match(docs, /check:cloudflare-live-home/);
  assert.match(docs, /쿠팡파트너스 고지/);
  assert.match(docs, /link\.coupang\.com/);
});

test("Cloudflare config checker is wired into CI-safe static checks", () => {
  const checker = readFileSync("scripts/check-cloudflare-config.mjs", "utf8");
  const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

  assert.match(checker, /Cloudflare deployment config check/);
  assert.match(checker, /run_worker_first/);
  assert.match(checker, /wrangler secrets\.required/);
  assert.match(checker, /deferred until Cloudflare runtime secrets are registered/);
  assert.match(checker, /wrangler secret hygiene/);
  assert.match(ciGate, /check-cloudflare-config\.mjs/);
});

test("Cloudflare live home checker fails bootstrap loader pages", () => {
  const checker = readFileSync("scripts/check-cloudflare-live-home.mjs", "utf8");

  assert.match(checker, /Cloudflare live home check/);
  assert.match(checker, /집밥노트 불러오는 중/);
  assert.match(checker, /원격 앱 연결을 확인하는 중입니다/);
  assert.match(checker, /Cloudflare home is still serving bootstrap loader text/);
  assert.match(checker, /집밥노트/);
  assert.match(checker, /냉장고/);
  assert.match(checker, /레시피/);
  assert.match(checker, /장보기/);
});

test("Cloudflare external checker applies Cloudflare env to every gate", () => {
  const checker = readFileSync("scripts/check-cloudflare-external-release.mjs", "utf8");

  assert.match(checker, /SUPABASE_LIVE_WRITE_TEST: "1"/);
  assert.match(checker, /CHECK_VERCEL_PRODUCTION_ENV: "0"/);
  assert.match(checker, /PRODUCTION_APP_URL: CLOUDFLARE_APP_URL/);
  assert.match(checker, /NEXT_PUBLIC_SITE_URL: CLOUDFLARE_APP_URL/);
  assert.match(checker, /CAPACITOR_SERVER_URL: CLOUDFLARE_APP_URL/);
  assert.match(checker, /check-cloudflare-live-home\.mjs/);
  assert.match(checker, /check-supabase-live\.mjs/);
  assert.match(checker, /check-production-family-route\.mjs/);
  assert.match(checker, /check-production-account-deletion-route\.mjs/);
});

test("Cloudflare build artifacts are ignored by lint and git", () => {
  const eslintConfig = readFileSync("eslint.config.mjs", "utf8");
  const gitignore = readFileSync(".gitignore", "utf8");

  assert.match(eslintConfig, /"\.open-next\/\*\*"/);
  assert.match(eslintConfig, /"\.wrangler\/\*\*"/);
  assert.match(gitignore, /\.open-next\//);
  assert.match(gitignore, /\.wrangler\//);
});

test("Capacitor bootstrap shell is separated from Next public assets", () => {
  const capacitorConfig = readFileSync("capacitor.config.ts", "utf8");
  const syncScript = readFileSync("scripts/sync-capacitor.mjs", "utf8");
  const readinessScript = readFileSync("scripts/release-readiness-check.mjs", "utf8");

  assert.match(capacitorConfig, /webDir: 'capacitor-shell'/);
  assert.match(syncScript, /"capacitor-shell", "runtime-app-config\.json"/);
  assert.match(readinessScript, /capacitor-shell\/runtime-app-config\.json/);
  assert.doesNotMatch(capacitorConfig, /webDir: 'public'/);
});
