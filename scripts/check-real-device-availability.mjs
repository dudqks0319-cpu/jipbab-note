import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const adbPath = process.env.ADB_PATH || "/Users/jyb-m3max/Library/Android/sdk/platform-tools/adb";

function sectionLines(output, sectionName) {
  const lines = output.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === `== ${sectionName} ==`);
  if (startIndex === -1) {
    return [];
  }

  const collected = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (line.trim().startsWith("== ")) {
      break;
    }
    if (line.trim()) {
      collected.push(line.trim());
    }
  }
  return collected;
}

function looksLikeIosPhysicalDevice(line) {
  return /\(\d+(?:\.\d+){0,2}\)\s+\([0-9A-Fa-f-]{8,}\)$/.test(line);
}

function listIosDevices() {
  const result = spawnSync("xcrun", ["xctrace", "list", "devices"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error) {
    return {
      available: [],
      offline: [],
      error: result.error.message,
    };
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    return {
      available: [],
      offline: [],
      error: "xcrun xctrace list devices failed",
    };
  }

  return {
    available: sectionLines(output, "Devices").filter(looksLikeIosPhysicalDevice),
    offline: sectionLines(output, "Devices Offline").filter(looksLikeIosPhysicalDevice),
    error: "",
  };
}

function listAndroidDevices() {
  if (!existsSync(adbPath)) {
    return {
      available: [],
      unavailable: [],
      error: `adb not found at ${adbPath}`,
    };
  }

  const result = spawnSync(adbPath, ["devices", "-l"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error) {
    return {
      available: [],
      unavailable: [],
      error: result.error.message,
    };
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    return {
      available: [],
      unavailable: [],
      error: "adb devices -l failed",
    };
  }

  const deviceLines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices attached"));

  return {
    available: deviceLines.filter((line) => /^\S+\s+device\b/.test(line)),
    unavailable: deviceLines.filter((line) => !/^\S+\s+device\b/.test(line)),
    error: "",
  };
}

function summarizeDevice(line) {
  return line.replace(/\s+/g, " ").slice(0, 160);
}

function run() {
  const ios = listIosDevices();
  const android = listAndroidDevices();
  const failures = [];
  const passes = [];
  const warnings = [];

  if (ios.error) {
    failures.push(`iOS device list: ${ios.error}`);
  } else if (ios.available.length > 0) {
    passes.push(`iOS physical device available: ${summarizeDevice(ios.available[0])}`);
  } else if (ios.offline.length > 0) {
    failures.push(`iOS physical device offline: ${summarizeDevice(ios.offline[0])}`);
  } else {
    failures.push("iOS physical device: none available");
  }

  if (ios.offline.length > 0 && ios.available.length > 0) {
    warnings.push(`additional iOS offline device: ${summarizeDevice(ios.offline[0])}`);
  }

  if (android.error) {
    failures.push(`Android device list: ${android.error}`);
  } else if (android.available.length > 0) {
    passes.push(`Android physical device available: ${summarizeDevice(android.available[0])}`);
  } else if (android.unavailable.length > 0) {
    failures.push(`Android physical device unavailable: ${summarizeDevice(android.unavailable[0])}`);
  } else {
    failures.push("Android physical device: none attached");
  }

  console.log("Real device availability check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Failures: ${failures.length}`);

  if (passes.length > 0) {
    console.log("\nPASS");
    for (const item of passes) {
      console.log(`- ${item}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\nWARN");
    for (const item of warnings) {
      console.log(`- ${item}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFAIL");
    for (const item of failures) {
      console.log(`- ${item}`);
    }
    process.exit(1);
  }
}

run();
