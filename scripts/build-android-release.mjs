// 이 파일은 로컬 env 파일의 Android 서명값을 주입해 release AAB를 빌드합니다.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
const envFilePaths = [
  path.join(cwd, ".env.local"),
  path.join(cwd, ".env.android-signing.local"),
];
const jdk21Home = "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";
const jdk21Bin = "/opt/homebrew/opt/openjdk@21/bin";
const androidSdk = "/Users/jyb-m3max/Library/Android/sdk";

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const pairs = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    pairs[key] = value;
  }
  return pairs;
}

const envFromFiles = Object.assign({}, ...envFilePaths.map(readEnvFile));
const env = {
  ...process.env,
  ...envFromFiles,
};

if (existsSync(jdk21Home)) {
  env.JAVA_HOME = env.JAVA_HOME || jdk21Home;
}
if (existsSync(androidSdk)) {
  env.ANDROID_HOME = env.ANDROID_HOME || androidSdk;
  env.ANDROID_SDK_ROOT = env.ANDROID_SDK_ROOT || androidSdk;
}
if (existsSync(jdk21Bin)) {
  env.PATH = `${jdk21Bin}:${env.PATH ?? ""}`;
}

const requiredKeys = [
  "ANDROID_UPLOAD_KEYSTORE_PATH",
  "ANDROID_UPLOAD_KEYSTORE_PASSWORD",
  "ANDROID_UPLOAD_KEY_ALIAS",
  "ANDROID_UPLOAD_KEY_PASSWORD",
];
const missingKeys = requiredKeys.filter((key) => !env[key]);
if (missingKeys.length > 0) {
  console.error(`Missing Android signing env keys: ${missingKeys.join(", ")}`);
  console.error("Run pnpm android:upload-key:create first, or provide your existing Play upload key values.");
  process.exit(1);
}

if (!existsSync(env.ANDROID_UPLOAD_KEYSTORE_PATH)) {
  console.error("ANDROID_UPLOAD_KEYSTORE_PATH does not point to an existing keystore file.");
  process.exit(1);
}

console.log("Building signed Android release AAB.");
console.log(`- keystore: ${path.relative(cwd, env.ANDROID_UPLOAD_KEYSTORE_PATH)}`);
console.log(`- alias: ${env.ANDROID_UPLOAD_KEY_ALIAS}`);

const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(gradle, ["bundleRelease"], {
  cwd: path.join(cwd, "android"),
  env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
