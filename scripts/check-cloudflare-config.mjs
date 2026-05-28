import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const requiredFiles = [
  "open-next.config.ts",
  "wrangler.jsonc",
  "docs/cloudflare-deployment.md",
];
const requiredPackageScripts = [
  "cloudflare:build",
  "cloudflare:preview",
  "cloudflare:deploy",
  "check:cloudflare-config",
];
const requiredDevDependencies = ["@opennextjs/cloudflare", "wrangler"];

function add(results, level, label, detail) {
  results.push({ level, label, detail });
}

function readProjectFile(relativePath) {
  return readFileSync(path.join(cwd, relativePath), "utf8");
}

const results = [];

for (const filePath of requiredFiles) {
  if (existsSync(path.join(cwd, filePath))) {
    add(results, "pass", filePath, "present");
  } else {
    add(results, "fail", filePath, "missing");
  }
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const scripts = packageJson.scripts ?? {};
const devDependencies = packageJson.devDependencies ?? {};

for (const scriptName of requiredPackageScripts) {
  if (scripts[scriptName]) {
    add(results, "pass", `package script ${scriptName}`, scripts[scriptName]);
  } else {
    add(results, "fail", `package script ${scriptName}`, "missing");
  }
}

for (const dependencyName of requiredDevDependencies) {
  if (devDependencies[dependencyName]) {
    add(results, "pass", `devDependency ${dependencyName}`, devDependencies[dependencyName]);
  } else {
    add(results, "fail", `devDependency ${dependencyName}`, "missing");
  }
}

if (existsSync(path.join(cwd, "wrangler.jsonc"))) {
  const wrangler = readProjectFile("wrangler.jsonc");
  const requiredWranglerTerms = [
    '"name": "jipbab-note-app"',
    '"main": ".open-next/worker.js"',
    '"nodejs_compat"',
    '"global_fetch_strictly_public"',
    '".open-next/assets"',
    '"WORKER_SELF_REFERENCE"',
  ];
  for (const term of requiredWranglerTerms) {
    if (wrangler.includes(term)) {
      add(results, "pass", `wrangler ${term}`, "configured");
    } else {
      add(results, "fail", `wrangler ${term}`, "missing");
    }
  }

  const forbiddenSecretPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]/,
    /NEXT_PUBLIC_SUPABASE_ANON_KEY\s*[:=]\s*["'][A-Za-z0-9_.-]{20,}/,
    /ADMIN_EMAILS\s*[:=]/,
  ];
  const leakedPattern = forbiddenSecretPatterns.find((pattern) => pattern.test(wrangler));
  if (leakedPattern) {
    add(results, "fail", "wrangler secret hygiene", "must not hardcode Supabase/admin secret values");
  } else {
    add(results, "pass", "wrangler secret hygiene", "no Supabase/admin env values are hardcoded");
  }
}

if (existsSync(path.join(cwd, "open-next.config.ts"))) {
  const openNextConfig = readProjectFile("open-next.config.ts");
  const requiredOpenNextTerms = [
    "defineCloudflareConfig",
    'incrementalCache: "dummy"',
    'tagCache: "dummy"',
    'queue: "dummy"',
  ];
  for (const term of requiredOpenNextTerms) {
    if (openNextConfig.includes(term)) {
      add(results, "pass", `open-next ${term}`, "configured");
    } else {
      add(results, "fail", `open-next ${term}`, "missing");
    }
  }
}

if (existsSync(path.join(cwd, ".gitignore"))) {
  const gitignore = readProjectFile(".gitignore");
  for (const ignoredPath of [".open-next/", ".wrangler/"]) {
    if (gitignore.includes(ignoredPath)) {
      add(results, "pass", `gitignore ${ignoredPath}`, "ignored");
    } else {
      add(results, "fail", `gitignore ${ignoredPath}`, "missing");
    }
  }
}

const failures = results.filter((item) => item.level === "fail");
const passes = results.filter((item) => item.level === "pass");

console.log("Cloudflare deployment config check");
console.log(`Passes: ${passes.length}`);
console.log(`Failures: ${failures.length}`);

if (passes.length > 0) {
  console.log("\nPASS");
  for (const item of passes) {
    console.log(`- ${item.label}: ${item.detail}`);
  }
}

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const item of failures) {
    console.log(`- ${item.label}: ${item.detail}`);
  }
  process.exit(1);
}
