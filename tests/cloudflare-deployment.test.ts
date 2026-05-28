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
  assert.match(wrangler, /"WORKER_SELF_REFERENCE"/);
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
  assert.match(docs, /쿠팡파트너스 고지/);
  assert.match(docs, /link\.coupang\.com/);
});

test("Cloudflare config checker is wired into CI-safe static checks", () => {
  const checker = readFileSync("scripts/check-cloudflare-config.mjs", "utf8");
  const ciGate = readFileSync("scripts/run-ci-release-gates.mjs", "utf8");

  assert.match(checker, /Cloudflare deployment config check/);
  assert.match(checker, /wrangler secret hygiene/);
  assert.match(ciGate, /check-cloudflare-config\.mjs/);
});

test("Cloudflare build artifacts are ignored by lint and git", () => {
  const eslintConfig = readFileSync("eslint.config.mjs", "utf8");
  const gitignore = readFileSync(".gitignore", "utf8");

  assert.match(eslintConfig, /"\.open-next\/\*\*"/);
  assert.match(eslintConfig, /"\.wrangler\/\*\*"/);
  assert.match(gitignore, /\.open-next\//);
  assert.match(gitignore, /\.wrangler\//);
});
