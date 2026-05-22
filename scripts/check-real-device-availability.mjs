import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const adbPath = process.env.ADB_PATH || "/Users/jyb-m3max/Library/Android/sdk/platform-tools/adb";
const allowedPlatforms = new Set(["all", "ios", "android"]);

function targetPlatform() {
  const arg = process.argv.find((item) => item.startsWith("--platform="));
  const rawValue = (arg?.split("=")[1] || process.env.REAL_DEVICE_PLATFORM || "all").toLowerCase();
  if (!allowedPlatforms.has(rawValue)) {
    console.error(`Unknown real-device platform: ${rawValue}`);
    console.error("Use --platform=ios, --platform=android, or --platform=all.");
    process.exit(2);
  }
  return rawValue;
}

function shouldCheck(target, platform) {
  return target === "all" || target === platform;
}

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

function parseCoreDeviceRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("Name ") && !line.startsWith("----"))
    .map((line) => {
      const parts = line.split(/\s{2,}/);
      return {
        raw: line,
        state: parts[3] ?? "",
        model: parts.slice(4).join(" "),
      };
    })
    .filter((device) => /\b(iPhone|iPad)\b/.test(device.model));
}

function listIosCoreDevices() {
  const result = spawnSync("xcrun", ["devicectl", "list", "devices"], {
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
      error: "xcrun devicectl list devices failed",
    };
  }

  const devices = parseCoreDeviceRows(output);
  return {
    available: devices.filter((device) => device.state === "available").map((device) => device.raw),
    unavailable: devices.filter((device) => device.state && device.state !== "available").map((device) => device.raw),
    error: "",
  };
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
  const platform = targetPlatform();
  const ios = shouldCheck(platform, "ios") ? listIosDevices() : null;
  const coreIos = shouldCheck(platform, "ios") ? listIosCoreDevices() : null;
  const android = shouldCheck(platform, "android") ? listAndroidDevices() : null;
  const failures = [];
  const passes = [];
  const warnings = [];

  if (ios && coreIos) {
    if (ios.error && coreIos.error) {
      failures.push(`iOS device list: ${ios.error}; ${coreIos.error}`);
    } else if (ios.available.length > 0 || coreIos.available.length > 0) {
      const availableDevice = ios.available[0] ?? coreIos.available[0];
      passes.push(`iOS physical device available: ${summarizeDevice(availableDevice)}`);
    } else if (coreIos.unavailable.length > 0) {
      failures.push(`iOS CoreDevice unavailable: ${summarizeDevice(coreIos.unavailable[0])}`);
    } else if (ios.offline.length > 0) {
      failures.push(`iOS physical device offline: ${summarizeDevice(ios.offline[0])}`);
    } else if (ios.error) {
      failures.push(`iOS device list: ${ios.error}`);
    } else if (coreIos.error) {
      failures.push(`iOS CoreDevice list: ${coreIos.error}`);
    } else {
      failures.push("iOS physical device: none available");
    }

    if (ios.offline.length > 0 && ios.available.length > 0) {
      warnings.push(`additional iOS offline device: ${summarizeDevice(ios.offline[0])}`);
    }
  }

  if (android) {
    if (android.error) {
      failures.push(`Android device list: ${android.error}`);
    } else if (android.available.length > 0) {
      passes.push(`Android physical device available: ${summarizeDevice(android.available[0])}`);
    } else if (android.unavailable.length > 0) {
      failures.push(`Android physical device unavailable: ${summarizeDevice(android.unavailable[0])}`);
    } else {
      failures.push("Android physical device: none attached");
    }
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
