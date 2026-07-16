// 이 파일은 iOS archive/export 산출물이 현재 프로젝트 설정과 맞는지 점검합니다.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const plistBuddy = "/usr/libexec/PlistBuddy";
const expectedBundleId = "com.jipbab.note";
const expectedTeamId = "3FG9QJC8WC";
const minimumIpaBytes = 10 * 1024 * 1024;
const projectPath = path.join(cwd, "ios/App/App.xcodeproj/project.pbxproj");
const compactRemoteShellEntries = [
  "Payload/App.app/App",
  "Payload/App.app/Frameworks/Capacitor.framework/Capacitor",
  "Payload/App.app/Frameworks/Cordova.framework/Cordova",
  "Payload/App.app/capacitor.config.json",
  "Payload/App.app/public/runtime-app-config.json",
];

function addResult(results, level, label, detail) {
  results.push({ level, label, detail });
}

function displayPath(filePath) {
  return path.relative(cwd, filePath) || ".";
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function resolveFromEnv(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  return path.isAbsolute(value) ? value : path.join(cwd, value);
}

function newestArchivePath() {
  const buildDir = path.join(cwd, "ios/build");
  if (!existsSync(buildDir)) {
    return null;
  }

  const archives = readdirSync(buildDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".xcarchive"))
    .map((entry) => path.join(buildDir, entry.name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

  return archives[0] ?? null;
}

function defaultArchivePath() {
  return newestArchivePath();
}

function newestIpaPath() {
  const buildDir = path.join(cwd, "ios/build");
  if (!existsSync(buildDir)) {
    return null;
  }

  const ipaFiles = readdirSync(buildDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(buildDir, entry.name, "App.ipa"))
    .filter((candidate) => existsSync(candidate))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);

  return ipaFiles[0] ?? null;
}

function defaultIpaPath() {
  return newestIpaPath() ?? path.join(cwd, "ios/build/export-check/App.ipa");
}

function defaultExportOptionsPath(ipaFilePath) {
  const siblingExportOptions = path.join(path.dirname(ipaFilePath), "ExportOptions.plist");
  if (existsSync(siblingExportOptions)) {
    return siblingExportOptions;
  }

  return path.join(cwd, "ios/build/export-check/ExportOptions.plist");
}

function readPlistValue(plistPath, key) {
  const result = spawnSync(plistBuddy, ["-c", `Print ${key}`, plistPath], {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function readProjectSetting(settingName) {
  if (!existsSync(projectPath)) {
    return [];
  }

  const source = readFileSync(projectPath, "utf8");
  const appBuildConfigIds = appTargetBuildConfigurationIds(source);
  const sourceToRead =
    appBuildConfigIds.length > 0
      ? appBuildConfigIds.map((id) => projectObjectBlock(source, id)).filter(Boolean).join("\n")
      : source;

  const matches = [...sourceToRead.matchAll(new RegExp(`${settingName}\\s*=\\s*([^;]+);`, "g"))]
    .map((match) => match[1].trim().replace(/^"|"$/g, ""));

  return [...new Set(matches)];
}

function appTargetBuildConfigurationIds(source) {
  const targetMatch = source.match(
    /\/\* App \*\/ = \{\s*isa = PBXNativeTarget;[\s\S]*?buildConfigurationList = ([A-Z0-9]+) \/\* Build configuration list for PBXNativeTarget "App" \*\/;[\s\S]*?name = App;[\s\S]*?productType = "com\.apple\.product-type\.application";[\s\S]*?\n\t\t\};/,
  );
  const configurationListId = targetMatch?.[1];
  if (!configurationListId) {
    return [];
  }

  const configurationList = projectObjectBlock(source, configurationListId);
  if (!configurationList) {
    return [];
  }

  const configurations = configurationList.match(/buildConfigurations = \(([\s\S]*?)\);/)?.[1] ?? "";
  return [...configurations.matchAll(/([A-Z0-9]+) \/\* (?:Debug|Release) \*\//g)].map((match) => match[1]);
}

function projectObjectBlock(source, objectId) {
  const escapedId = objectId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`\\n\\t\\t${escapedId} [\\s\\S]*?\\n\\t\\t\\};`))?.[0] ?? "";
}

function projectSetting(results, settingName, label) {
  const values = readProjectSetting(settingName);

  if (values.length === 1) {
    addResult(results, "pass", label, values[0]);
    return values[0];
  }

  if (values.length === 0) {
    addResult(results, "fail", label, `${settingName} is missing from ${displayPath(projectPath)}`);
    return null;
  }

  addResult(results, "fail", label, `${settingName} has multiple values: ${values.join(", ")}`);
  return null;
}

function runCodesign(appBundlePath) {
  return spawnSync("codesign", ["-dv", "--verbose=2", appBundlePath], {
    cwd,
    encoding: "utf8",
  });
}

function validateCompactRemoteShellIpa(filePath) {
  const listing = spawnSync("unzip", ["-l", filePath], {
    cwd,
    encoding: "utf8",
  });
  if (listing.status !== 0) {
    return { ok: false, detail: "could not inspect IPA contents" };
  }

  const missingEntries = compactRemoteShellEntries.filter((entry) => !listing.stdout.includes(entry));
  if (missingEntries.length > 0) {
    return {
      ok: false,
      detail: `compact IPA is missing required entries: ${missingEntries.join(", ")}`,
    };
  }

  const runtimeConfig = spawnSync("unzip", ["-p", filePath, "Payload/App.app/public/runtime-app-config.json"], {
    cwd,
    encoding: "utf8",
  });
  if (runtimeConfig.status !== 0) {
    return { ok: false, detail: "could not read runtime app config from IPA" };
  }

  try {
    const parsed = JSON.parse(runtimeConfig.stdout);
    if (typeof parsed.remoteUrl !== "string" || !parsed.remoteUrl.startsWith("https://")) {
      return { ok: false, detail: "runtime remoteUrl is missing or not HTTPS" };
    }
    return { ok: true, detail: `compact remote shell IPA, remoteUrl ${parsed.remoteUrl}` };
  } catch {
    return { ok: false, detail: "runtime app config is not valid JSON" };
  }
}

const results = [];
const archivePath = resolveFromEnv("IOS_ARCHIVE_PATH", defaultArchivePath());
const ipaPath = resolveFromEnv("IOS_IPA_PATH", defaultIpaPath());
const exportOptionsPath = resolveFromEnv("IOS_EXPORT_OPTIONS_PATH", defaultExportOptionsPath(ipaPath));

const projectBundleId = projectSetting(results, "PRODUCT_BUNDLE_IDENTIFIER", "iOS project bundle id");
const projectVersion = projectSetting(results, "MARKETING_VERSION", "iOS project marketing version");
const projectBuild = projectSetting(results, "CURRENT_PROJECT_VERSION", "iOS project build number");
const projectTeam = projectSetting(results, "DEVELOPMENT_TEAM", "iOS project team id");

if (!archivePath || !existsSync(archivePath)) {
  addResult(results, "fail", "iOS archive", "archive is missing; set IOS_ARCHIVE_PATH or create a fresh archive");
} else {
  const archiveInfoPath = path.join(archivePath, "Info.plist");
  if (!existsSync(archiveInfoPath)) {
    addResult(results, "fail", "iOS archive Info.plist", `${displayPath(archiveInfoPath)} is missing`);
  } else {
    addResult(results, "pass", "iOS archive", displayPath(archivePath));

    const archiveBundleId = readPlistValue(archiveInfoPath, ":ApplicationProperties:CFBundleIdentifier");
    const archiveVersion = readPlistValue(
      archiveInfoPath,
      ":ApplicationProperties:CFBundleShortVersionString",
    );
    const archiveBuild = readPlistValue(archiveInfoPath, ":ApplicationProperties:CFBundleVersion");
    const archiveTeam = readPlistValue(archiveInfoPath, ":ApplicationProperties:Team");
    const archiveAppPath = readPlistValue(archiveInfoPath, ":ApplicationProperties:ApplicationPath");
    const architectures = readPlistValue(archiveInfoPath, ":ApplicationProperties:Architectures") ?? "";

    if (archiveBundleId === expectedBundleId && archiveBundleId === projectBundleId) {
      addResult(results, "pass", "iOS archive bundle id", archiveBundleId);
    } else {
      addResult(
        results,
        "fail",
        "iOS archive bundle id",
        `archive ${archiveBundleId ?? "missing"}, expected ${expectedBundleId}, project ${projectBundleId ?? "missing"}`,
      );
    }

    if (archiveVersion && archiveVersion === projectVersion) {
      addResult(results, "pass", "iOS archive marketing version", archiveVersion);
    } else {
      addResult(
        results,
        "fail",
        "iOS archive marketing version",
        `archive ${archiveVersion ?? "missing"}, project ${projectVersion ?? "missing"}`,
      );
    }

    if (archiveBuild && archiveBuild === projectBuild) {
      addResult(results, "pass", "iOS archive build number", archiveBuild);
    } else {
      addResult(
        results,
        "fail",
        "iOS archive build number",
        `archive ${archiveBuild ?? "missing"}, project ${projectBuild ?? "missing"}; create a fresh archive before release`,
      );
    }

    if (archiveTeam === expectedTeamId && archiveTeam === projectTeam) {
      addResult(results, "pass", "iOS archive team id", archiveTeam);
    } else {
      addResult(
        results,
        "fail",
        "iOS archive team id",
        `archive ${archiveTeam ?? "missing"}, expected ${expectedTeamId}, project ${projectTeam ?? "missing"}`,
      );
    }

    if (architectures.includes("arm64")) {
      addResult(results, "pass", "iOS archive architecture", "arm64 is present");
    } else {
      addResult(results, "fail", "iOS archive architecture", "arm64 is missing");
    }

    const appBundlePath = archiveAppPath ? path.join(archivePath, "Products", archiveAppPath) : null;
    if (appBundlePath && existsSync(appBundlePath)) {
      addResult(results, "pass", "iOS app bundle", displayPath(appBundlePath));

      const codesign = runCodesign(appBundlePath);
      const codesignOutput = `${codesign.stdout ?? ""}\n${codesign.stderr ?? ""}`;
      if (codesign.error) {
        addResult(results, "fail", "iOS codesign", codesign.error.message);
      } else if (
        codesign.status === 0 &&
        codesignOutput.includes(`Identifier=${expectedBundleId}`) &&
        codesignOutput.includes(`TeamIdentifier=${expectedTeamId}`)
      ) {
        addResult(results, "pass", "iOS codesign", "bundle id and team identifier match");
      } else {
        addResult(results, "fail", "iOS codesign", "bundle id or team identifier did not match codesign output");
      }
    } else {
      addResult(results, "fail", "iOS app bundle", "archive app bundle is missing");
    }

    const uploadState = readPlistValue(archiveInfoPath, ":Distributions:0:uploadEvent:state");
    const uploadedBuildNumber = readPlistValue(archiveInfoPath, ":Distributions:0:uploadedBuildNumber");
    if (uploadState === "success") {
      addResult(results, "pass", "iOS App Store upload history", `state ${uploadState}, uploaded build ${uploadedBuildNumber ?? "unknown"}`);
    } else {
      addResult(results, "warn", "iOS App Store upload history", "archive has no successful upload event");
    }
  }
}

if (!existsSync(exportOptionsPath)) {
  addResult(results, "fail", "iOS export options", `${displayPath(exportOptionsPath)} is missing`);
} else {
  const method = readPlistValue(exportOptionsPath, ":method");
  const destination = readPlistValue(exportOptionsPath, ":destination");
  const teamId = readPlistValue(exportOptionsPath, ":teamID");

  if (method === "app-store-connect") {
    addResult(results, "pass", "iOS export method", method);
  } else {
    addResult(results, "fail", "iOS export method", `expected app-store-connect, got ${method ?? "missing"}`);
  }

  if (destination === "export") {
    addResult(results, "pass", "iOS export destination", destination);
  } else {
    addResult(results, "fail", "iOS export destination", `expected export, got ${destination ?? "missing"}`);
  }

  if (teamId === expectedTeamId) {
    addResult(results, "pass", "iOS export team id", teamId);
  } else {
    addResult(results, "fail", "iOS export team id", `expected ${expectedTeamId}, got ${teamId ?? "missing"}`);
  }
}

if (!existsSync(ipaPath)) {
  addResult(results, "fail", "iOS IPA", `${displayPath(ipaPath)} is missing`);
} else {
  const stats = statSync(ipaPath);
  const digest = sha256(ipaPath);

  if (stats.size >= minimumIpaBytes) {
    addResult(results, "pass", "iOS IPA", `${Math.round(stats.size / 1024 / 1024)}MB, sha256 ${digest}`);
  } else {
    const compactIpa = validateCompactRemoteShellIpa(ipaPath);
    if (compactIpa.ok) {
      addResult(results, "pass", "iOS IPA", `${stats.size} bytes, sha256 ${digest}; ${compactIpa.detail}`);
    } else {
      addResult(results, "fail", "iOS IPA", `artifact is unexpectedly small: ${stats.size} bytes; ${compactIpa.detail}`);
    }
  }

  const archiveInfoPath = archivePath ? path.join(archivePath, "Info.plist") : null;
  if (archiveInfoPath && existsSync(archiveInfoPath)) {
    const archiveStats = statSync(archiveInfoPath);
    if (stats.mtimeMs >= archiveStats.mtimeMs) {
      addResult(results, "pass", "iOS IPA freshness", "IPA is not older than the archive metadata");
    } else {
      addResult(results, "fail", "iOS IPA freshness", "IPA is older than the archive metadata; export a fresh IPA");
    }
  }
}

const passes = results.filter((item) => item.level === "pass");
const warnings = results.filter((item) => item.level === "warn");
const failures = results.filter((item) => item.level === "fail");

console.log("iOS release artifact check");
console.log(`Passes: ${passes.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Failures: ${failures.length}`);

if (passes.length > 0) {
  console.log("\nPASS");
  for (const item of passes) {
    console.log(`- ${item.label}: ${item.detail}`);
  }
}

if (warnings.length > 0) {
  console.log("\nWARN");
  for (const item of warnings) {
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
