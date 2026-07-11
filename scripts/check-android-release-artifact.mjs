import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const aabPath = path.join(cwd, "android/app/build/outputs/bundle/release/app-release.aab");
const minimumAabBytes = 10 * 1024 * 1024;
const homebrewJarsigner = "/opt/homebrew/opt/openjdk@21/bin/jarsigner";
const compactRemoteShellEntries = [
  "BundleConfig.pb",
  "base/assets/capacitor.config.json",
  "base/assets/public/runtime-app-config.json",
  "base/dex/classes.dex",
  "base/manifest/AndroidManifest.xml",
];

function addResult(results, level, label, detail) {
  results.push({ level, label, detail });
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function runJarsigner(filePath) {
  const jarsigner = existsSync(homebrewJarsigner) ? homebrewJarsigner : "jarsigner";
  return spawnSync(jarsigner, ["-verify", "-verbose", "-certs", filePath], {
    cwd,
    encoding: "utf8",
  });
}

function validateCompactRemoteShellAab(filePath) {
  const listing = spawnSync("unzip", ["-l", filePath], {
    cwd,
    encoding: "utf8",
  });
  if (listing.status !== 0) {
    return { ok: false, detail: "could not inspect AAB contents" };
  }

  const missingEntries = compactRemoteShellEntries.filter((entry) => !listing.stdout.includes(entry));
  if (missingEntries.length > 0) {
    return {
      ok: false,
      detail: `compact AAB is missing required entries: ${missingEntries.join(", ")}`,
    };
  }

  const runtimeConfig = spawnSync(
    "unzip",
    ["-p", filePath, "base/assets/public/runtime-app-config.json"],
    { cwd, encoding: "utf8" },
  );
  if (runtimeConfig.status !== 0) {
    return { ok: false, detail: "could not read runtime app config from AAB" };
  }

  try {
    const parsed = JSON.parse(runtimeConfig.stdout);
    if (typeof parsed.remoteUrl !== "string" || !parsed.remoteUrl.startsWith("https://")) {
      return { ok: false, detail: "runtime remoteUrl is missing or not HTTPS" };
    }
    return { ok: true, detail: `compact remote shell AAB, remoteUrl ${parsed.remoteUrl}` };
  } catch {
    return { ok: false, detail: "runtime app config is not valid JSON" };
  }
}

const results = [];

if (!existsSync(aabPath)) {
  addResult(results, "fail", "Android release AAB", "android/app/build/outputs/bundle/release/app-release.aab is missing");
} else {
  const stats = statSync(aabPath);
  const digest = sha256(aabPath);

  if (stats.size >= minimumAabBytes) {
    addResult(results, "pass", "Android release AAB", `${Math.round(stats.size / 1024 / 1024)}MB, sha256 ${digest}`);
  } else {
    const compactAab = validateCompactRemoteShellAab(aabPath);
    if (compactAab.ok) {
      addResult(results, "pass", "Android release AAB", `${stats.size} bytes, sha256 ${digest}; ${compactAab.detail}`);
    } else {
      addResult(results, "fail", "Android release AAB", `artifact is unexpectedly small: ${stats.size} bytes; ${compactAab.detail}`);
    }
  }

  const verification = runJarsigner(aabPath);
  const output = `${verification.stdout ?? ""}\n${verification.stderr ?? ""}`.trim();

  if (verification.error) {
    addResult(results, "fail", "Android AAB signature", verification.error.message);
  } else if (/jar is unsigned/i.test(output)) {
    addResult(results, "fail", "Android AAB signature", "artifact is unsigned");
  } else if (/jar verified/i.test(output) || /signature was verified/i.test(output)) {
    addResult(results, "pass", "Android AAB signature", "jarsigner verification passed");
  } else {
    addResult(results, "fail", "Android AAB signature", "jarsigner did not report a verified signature");
  }
}

const passes = results.filter((item) => item.level === "pass");
const failures = results.filter((item) => item.level === "fail");

console.log("Android release artifact check");
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
