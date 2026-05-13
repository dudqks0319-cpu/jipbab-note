#!/usr/bin/env node
// 이 파일은 iOS와 Android 제출 전 공통 검증을 한 번에 실행하는 통합 릴리즈 하네스입니다.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const rootDir = process.cwd();
const require = createRequire(import.meta.url);
const args = new Set(process.argv.slice(2));
const getArgValue = (prefix, fallback) => {
  const matched = [...args].find((arg) => arg.startsWith(`${prefix}=`));
  return matched ? matched.slice(prefix.length + 1) : fallback;
};

const port = Number(getArgValue("--port", process.env.MOBILE_RELEASE_PORT ?? "3013"));
const baseUrl = `http://127.0.0.1:${port}`;
const shouldRunIosBuild = args.has("--ios-build");
const shouldRunAndroidAab = args.has("--android-aab");
const requireAab = args.has("--require-aab");
const skipWebChecks = args.has("--skip-web");
const skipFlow = args.has("--skip-flow");
const checks = [];
let capacitorAndroidVersion = null;
let capacitorCoreVersion = null;

let serverProcess = null;

const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(rootDir, relativePath));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const record = (name, passed, detail) => {
  checks.push({ name, passed, detail });
  const marker = passed ? "PASS" : "FAIL";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
};

const expect = (condition, name, detail) => {
  record(name, Boolean(condition), detail);
};

const runCommand = (name, command, commandArgs, options = {}) => {
  console.log(`\n$ ${[command, ...commandArgs].join(" ")}`);
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? rootDir,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  expect(result.status === 0, name, `exit=${result.status ?? "signal"}${result.signal ? ` signal=${result.signal}` : ""}`);
  return result.status === 0;
};

const getPackageVersion = (packageName) => {
  try {
    return require(`${packageName}/package.json`).version;
  } catch {
    return null;
  }
};

const hasJavaRuntime = () => {
  const result = spawnSync("java", ["-version"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });
  return result.status === 0;
};

const checkStaticSubmissionReadiness = () => {
  const capacitorConfig = read("capacitor.config.ts");
  const infoPlist = read("ios/App/App/Info.plist");
  const androidManifest = read("android/app/src/main/AndroidManifest.xml");
  const androidStrings = read("android/app/src/main/res/values/strings.xml");
  const androidVariables = read("android/variables.gradle");
  const androidBuild = read("android/app/build.gradle");
  const envExample = read(".env.example");

  expect(capacitorConfig.includes("appId: 'com.jipbab.note'"), "Capacitor appId is stable", "com.jipbab.note");
  expect(capacitorConfig.includes("appName: '집밥노트'"), "Capacitor appName is Korean", "집밥노트");
  expect(infoPlist.includes("<string>집밥노트</string>"), "iOS display name is Korean", "Info.plist");
  expect(infoPlist.includes("NSCameraUsageDescription"), "iOS camera purpose string exists", "Info.plist");
  expect(infoPlist.includes("NSPhotoLibraryUsageDescription"), "iOS photo library purpose string exists", "Info.plist");

  expect(androidStrings.includes('<string name="app_name">집밥노트</string>'), "Android app name is Korean", "strings.xml");
  expect(androidManifest.includes("android.permission.CAMERA"), "Android camera permission exists", "AndroidManifest.xml");
  expect(androidManifest.includes('android.hardware.camera') && androidManifest.includes('android:required="false"'), "Android camera feature is optional", "AndroidManifest.xml");
  expect(androidBuild.includes('applicationId "com.jipbab.note"'), "Android applicationId is stable", "com.jipbab.note");
  expect(/targetSdkVersion\s*=\s*3[5-9]/.test(androidVariables), "Android targetSdkVersion is Play-ready", ">=35");

  expect(envExample.includes("SUPABASE_SERVICE_ROLE_KEY="), "server account deletion env documented", ".env.example");
  expect(envExample.includes("NEXT_PUBLIC_COMMUNITY_ENABLED=false"), "community is disabled by default", ".env.example");
  expect(exists("app/privacy/page.tsx"), "privacy route exists", "/privacy");
  expect(exists("app/terms/page.tsx"), "terms route exists", "/terms");
  expect(exists("app/support/page.tsx"), "support route exists", "/support");
  expect(exists("app/account/delete/page.tsx"), "data deletion route exists", "/account/delete");

  capacitorCoreVersion = getPackageVersion("@capacitor/core");
  const capacitorIosVersion = getPackageVersion("@capacitor/ios");
  capacitorAndroidVersion = getPackageVersion("@capacitor/android");
  expect(Boolean(capacitorCoreVersion), "Capacitor core installed", capacitorCoreVersion ?? "missing");
  expect(capacitorIosVersion === capacitorCoreVersion, "Capacitor iOS/Core versions match", `${capacitorIosVersion}/${capacitorCoreVersion}`);

  if (shouldRunAndroidAab || requireAab) {
    expect(Boolean(capacitorAndroidVersion), "Capacitor Android installed for AAB", capacitorAndroidVersion ?? "missing");
    if (capacitorAndroidVersion && capacitorCoreVersion) {
      expect(capacitorAndroidVersion === capacitorCoreVersion, "Capacitor Android/Core versions match", `${capacitorAndroidVersion}/${capacitorCoreVersion}`);
    }
  } else {
    record("Capacitor Android install optional", true, capacitorAndroidVersion ?? "missing until --android-aab");
  }
};

const waitForServer = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        record("local release server ready", true, `${baseUrl} -> ${response.status}`);
        return true;
      }
    } catch {
      // 서버 준비 전에는 재시도합니다.
    }
    await wait(500);
  }

  record("local release server ready", false, baseUrl);
  return false;
};

const startServer = async () => {
  serverProcess = spawn("pnpm", ["exec", "next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: rootDir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));

  return waitForServer();
};

const stopServer = () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
};

const runWebAndFlowChecks = async () => {
  if (skipWebChecks) {
    record("web checks skipped", true, "--skip-web");
    return;
  }

  runCommand("npm test", "npm", ["test"]);
  runCommand("pnpm build", "pnpm", ["build"]);

  if (skipFlow) {
    record("mobile flow skipped", true, "--skip-flow");
    return;
  }

  const ready = await startServer();
  if (ready) {
    runCommand("mobile flow harness", "pnpm", ["test:mobile-flow"], { env: { BASE_URL: baseUrl } });
  }
};

const runNativeBuildChecks = () => {
  if (shouldRunIosBuild) {
    runCommand("iOS simulator build", "xcodebuild", [
      "-project",
      "ios/App/App.xcodeproj",
      "-scheme",
      "App",
      "-configuration",
      "Debug",
      "-sdk",
      "iphonesimulator",
      "-destination",
      "generic/platform=iOS Simulator",
      "-derivedDataPath",
      "/private/tmp/jipbab-ios-release-harness",
      "CODE_SIGNING_ALLOWED=NO",
      "build",
    ]);
  } else {
    record("iOS simulator build skipped", true, "run with --ios-build");
  }

  if (shouldRunAndroidAab) {
    const hasAndroidPackage = Boolean(capacitorAndroidVersion);
    const hasJava = hasJavaRuntime();
    expect(hasJava, "Java runtime available for Android AAB", "required for Gradle bundleRelease");

    if (!hasAndroidPackage || !hasJava) {
      record(
        "Android AAB build blocked before Gradle",
        false,
        "install @capacitor/android and a JDK, then rerun test:mobile-release:full",
      );
    } else {
      const synced = runCommand("Capacitor Android sync", "pnpm", ["exec", "cap", "sync", "android"]);
      if (synced) {
        runCommand("Android release AAB", "./gradlew", ["bundleRelease", "--console=plain"], {
          cwd: path.join(rootDir, "android"),
        });
      } else {
        record("Android release AAB skipped", false, "Capacitor Android sync failed");
      }
    }
  } else {
    record("Android AAB build skipped", true, "run with --android-aab --require-aab");
  }

  runCommand("Android release harness", "pnpm", [
    "test:android-release",
    ...(requireAab ? ["--", "--require-aab"] : []),
  ]);
};

const finish = () => {
  const failed = checks.filter((check) => !check.passed);
  console.log("");
  console.log("MOBILE RELEASE HARNESS RESULT");
  console.log(`RESULT ${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) {
    console.log("");
    console.log("Failed checks:");
    for (const check of failed) {
      console.log(`- ${check.name}${check.detail ? `: ${check.detail}` : ""}`);
    }
    process.exitCode = 1;
  }
};

process.on("exit", stopServer);
process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});

try {
  checkStaticSubmissionReadiness();
  await runWebAndFlowChecks();
  runNativeBuildChecks();
} finally {
  stopServer();
  finish();
}
