#!/usr/bin/env node
// 이 파일은 Google Play 제출 전 Android 네이티브 설정과 정책 URL 준비 상태를 점검합니다.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const requireAab = process.argv.includes("--require-aab");
const strictNative = process.argv.includes("--strict-native");
const checks = [];
const require = createRequire(import.meta.url);

const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(rootDir, relativePath));

const record = (name, passed, detail) => {
  checks.push({ name, passed, detail });
  const marker = passed ? "PASS" : "FAIL";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
};

const expect = (condition, name, detail) => {
  record(name, Boolean(condition), detail);
};

const getGradleNumber = (source, key) => {
  const match = source.match(new RegExp(`${key}\\s*=\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
};

const getPackageVersion = (packageName) => {
  try {
    return require(`${packageName}/package.json`).version;
  } catch {
    return null;
  }
};

const hasJavaRuntime = () => {
  const result = spawnSync("java", ["-version"], { encoding: "utf8" });
  return result.status === 0;
};

const run = () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const strings = read("android/app/src/main/res/values/strings.xml");
  const variables = read("android/variables.gradle");
  const buildGradle = read("android/app/build.gradle");
  const envExample = read(".env.example");
  const readme = read("README.md");

  expect(strings.includes('<string name="app_name">집밥노트</string>'), "android app_name is Korean", "strings.xml");
  expect(
    strings.includes('<string name="title_activity_main">집밥노트</string>'),
    "android activity title is Korean",
    "strings.xml",
  );
  expect(buildGradle.includes('applicationId "com.jipbab.note"'), "applicationId is stable", "com.jipbab.note");
  expect(buildGradle.includes('namespace = "com.jipbab.note"'), "namespace is stable", "com.jipbab.note");

  const targetSdk = getGradleNumber(variables, "targetSdkVersion");
  const compileSdk = getGradleNumber(variables, "compileSdkVersion");
  expect(Number(targetSdk) >= 35, "targetSdkVersion >= 35", String(targetSdk));
  expect(Number(compileSdk) >= Number(targetSdk), "compileSdkVersion >= targetSdkVersion", `${compileSdk}/${targetSdk}`);

  expect(
    manifest.includes('android.permission.CAMERA'),
    "camera permission declared",
    "barcode scan can request camera",
  );
  expect(
    manifest.includes('android.hardware.camera') && manifest.includes('android:required="false"'),
    "camera feature is optional",
    "avoid filtering non-camera devices",
  );
  expect(manifest.includes('android.permission.INTERNET'), "internet permission declared", "Capacitor remote URL/API");

  expect(envExample.includes("NEXT_PUBLIC_COMMUNITY_ENABLED=false"), "community disabled by default", ".env.example");
  expect(exists("app/privacy/page.tsx"), "privacy policy route exists", "/privacy");
  expect(exists("app/terms/page.tsx"), "terms route exists", "/terms");
  expect(exists("app/support/page.tsx"), "support route exists", "/support");
  expect(exists("app/account/delete/page.tsx"), "data deletion route exists", "/account/delete");
  expect(readme.includes("Google Play"), "README documents Google Play readiness", "README.md");

  const capacitorCoreVersion = getPackageVersion("@capacitor/core");
  const capacitorAndroidVersion = getPackageVersion("@capacitor/android");
  if (strictNative || requireAab) {
    expect(Boolean(capacitorAndroidVersion), "Capacitor Android package installed", capacitorAndroidVersion ?? "missing");
  } else {
    record(
      "Capacitor Android package optional check",
      true,
      capacitorAndroidVersion ?? "missing until Android AAB build is required",
    );
  }
  if (capacitorAndroidVersion && capacitorCoreVersion) {
    expect(
      capacitorAndroidVersion === capacitorCoreVersion,
      "Capacitor Android/Core versions match",
      `${capacitorAndroidVersion}/${capacitorCoreVersion}`,
    );
  }
  if (strictNative || requireAab) {
    expect(hasJavaRuntime(), "Java runtime available for Gradle", "required for bundleRelease");
  }

  const aabPath = "android/app/build/outputs/bundle/release/app-release.aab";
  if (requireAab) {
    expect(exists(aabPath), "release AAB exists", aabPath);
  } else {
    record("release AAB optional check", true, exists(aabPath) ? aabPath : "run ./gradlew bundleRelease to create it");
  }

  const failed = checks.filter((check) => !check.passed);
  console.log("");
  console.log(`RESULT ${checks.length - failed.length}/${checks.length} Android release checks passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

run();
