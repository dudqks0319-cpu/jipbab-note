import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const evidenceRoot = path.join(cwd, "output", "release-evidence");
const iosProjectPath = path.join(cwd, "ios/App/App.xcodeproj/project.pbxproj");

const requiredFiles = [
  "summary.md",
  "apps.txt",
  "displays.txt",
  "lock-state.txt",
  "launch-home.json",
  "launch-home.log",
  "processes-after-launch.txt",
  "prod-root.headers.txt",
  "prod-api-recipes.headers.txt",
  "prod-fridge-image.headers.txt",
  "prod-beginner-030.headers.txt",
  "prod-beginner-053.headers.txt",
];

const headerRequirements = [
  ["prod-root.headers.txt", ["HTTP/2 200", "content-type: text/html", "x-matched-path: /"]],
  ["prod-api-recipes.headers.txt", ["HTTP/2 200", "content-type: application/json", "x-matched-path: /api/recipes"]],
  ["prod-fridge-image.headers.txt", ["HTTP/2 200", "content-type: image/png", "x-matched-path: /images/fridge-board-animated.png"]],
  [
    "prod-beginner-030.headers.txt",
    [
      "HTTP/2 200",
      "content-type: image/png",
      "x-matched-path: /images/recipes/beginner-food-photos/beginner-030-soondubu-egg-soup.png",
    ],
  ],
  [
    "prod-beginner-053.headers.txt",
    [
      "HTTP/2 200",
      "content-type: image/png",
      "x-matched-path: /images/recipes/beginner-imagegen-posters/beginner-053.png",
    ],
  ],
];

function readIosProjectBuildNumber() {
  if (!existsSync(iosProjectPath)) {
    return null;
  }

  const source = readFileSync(iosProjectPath, "utf8");
  const match = source.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/);
  return match?.[1]?.trim().replace(/^"|"$/g, "") ?? null;
}

function latestEvidenceDir() {
  if (!existsSync(evidenceRoot)) {
    return null;
  }

  const candidates = readdirSync(evidenceRoot)
    .filter((name) => name.endsWith("-cable-ios-qa"))
    .map((name) => path.join(evidenceRoot, name))
    .filter((candidatePath) => statSync(candidatePath).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  return candidates[0] ?? null;
}

function includesAll(source, terms) {
  return terms.every((term) => source.includes(term));
}

function fileText(dirPath, filename) {
  return readFileSync(path.join(dirPath, filename), "utf8");
}

function run() {
  const expectedBuild = readIosProjectBuildNumber() ?? "2026060803";
  const dirPath = process.env.IOS_CABLE_QA_EVIDENCE_DIR || latestEvidenceDir();
  const passes = [];
  const failures = [];
  const warnings = [];

  if (!dirPath || !existsSync(dirPath)) {
    failures.push("latest cable iOS QA evidence directory exists");
  } else {
    passes.push(`evidence directory: ${dirPath}`);

    for (const filename of requiredFiles) {
      if (existsSync(path.join(dirPath, filename))) {
        passes.push(`${filename}: present`);
      } else {
        failures.push(`${filename}: missing`);
      }
    }

    if (requiredFiles.every((filename) => existsSync(path.join(dirPath, filename)))) {
      const summary = fileText(dirPath, "summary.md");
      const apps = fileText(dirPath, "apps.txt");
      const displays = fileText(dirPath, "displays.txt");
      const lockState = fileText(dirPath, "lock-state.txt");
      const launchLog = fileText(dirPath, "launch-home.log");
      const launchJson = fileText(dirPath, "launch-home.json");
      const processes = fileText(dirPath, "processes-after-launch.txt");

      if (includesAll(summary, ["Cable iOS QA Packet", "no iPhone Mirroring used", "App: com.jipbab.note 1.0"])) {
        passes.push("summary: cable-only scope is documented");
      } else {
        failures.push("summary: missing cable-only scope");
      }

      if (apps.includes("com.jipbab.note") && apps.includes(expectedBuild)) {
        passes.push(`installed app: com.jipbab.note build ${expectedBuild}`);
      } else {
        failures.push(`installed app: com.jipbab.note build ${expectedBuild}`);
      }

      if (launchLog.includes("Launched application with com.jipbab.note bundle identifier") || launchJson.includes("com.jipbab.note")) {
        passes.push("launch: devicectl launch succeeded");
      } else {
        failures.push("launch: missing successful devicectl launch evidence");
      }

      if (processes.includes("/App.app/App")) {
        passes.push("process: App.app/App present after launch");
      } else {
        failures.push("process: App.app/App missing after launch");
      }

      if (displays.includes("backlight is on and active") && displays.includes("portrait")) {
        passes.push("display: active portrait state");
      } else {
        failures.push("display: active portrait state missing");
      }

      if (lockState.includes("unlockedSinceBoot: true")) {
        passes.push("lock state: device was unlocked since boot");
      } else {
        warnings.push("lock state: unlockedSinceBoot evidence missing");
      }

      for (const [filename, terms] of headerRequirements) {
        const source = fileText(dirPath, filename);
        if (includesAll(source, terms)) {
          passes.push(`${filename}: HTTP 200 expected content`);
        } else {
          failures.push(`${filename}: missing HTTP 200/content evidence`);
        }
      }
    }
  }

  warnings.push("tap-driven OAuth, notification permission UI, shopping external link UI, and account deletion UI are not covered by cable-only QA");

  console.log("iOS cable QA evidence check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Failures: ${failures.length}`);

  if (passes.length > 0) {
    console.log("\nPASS");
    for (const pass of passes) {
      console.log(`- ${pass}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\nWARN");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFAIL");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    process.exit(1);
  }
}

run();
