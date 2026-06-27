import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const defaultAndroidSdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (process.env.HOME ? path.join(process.env.HOME, "Library/Android/sdk") : "");
const adbPath = process.env.ADB_PATH || path.join(defaultAndroidSdk, "platform-tools/adb");
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

function redactAppleDeviceLine(line) {
  return line
    .replace(/\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}\b/g, "[redacted-device-id]")
    .replace(/\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\b/g, "[redacted-device-id]")
    .replace(/^.+?(?=\s+\(\d+(?:\.\d+){0,2}\)\s+\(\[redacted-device-id\]\)$)/, "iOS device")
    .replace(/[^\s()]+의\s+(?=iPhone|iPad)/g, "[redacted-device] ")
    .replace(/[^\s()]+(?:'s|’s)\s+(?=iPhone|iPad)/g, "[redacted-device] ");
}

function summarizeCoreDevice(device) {
  return redactAppleDeviceLine([device.state, device.model].filter(Boolean).join(" "));
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
    available: devices.filter((device) => device.state === "available").map(summarizeCoreDevice),
    unavailable: devices.filter((device) => device.state && device.state !== "available").map(summarizeCoreDevice),
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
    available: sectionLines(output, "Devices").filter(looksLikeIosPhysicalDevice).map(redactAppleDeviceLine),
    offline: sectionLines(output, "Devices Offline").filter(looksLikeIosPhysicalDevice).map(redactAppleDeviceLine),
    error: "",
  };
}

function redactAndroidDeviceLine(line) {
  return line.replace(/^\S+/, "[redacted-android-device]");
}

function isAndroidConnectedDevice(line) {
  return /^\S+\s+device\b/.test(line);
}

function looksLikeAndroidEmulator(line) {
  return (
    /^emulator-\d+\s/.test(line) ||
    /\b(model|device|product):(?:sdk_|emu)/i.test(line) ||
    /\bdevice:emu/i.test(line)
  );
}

function looksLikeAndroidPhysicalDevice(line) {
  return isAndroidConnectedDevice(line) && !looksLikeAndroidEmulator(line);
}

function listAndroidDevices() {
  if (!existsSync(adbPath)) {
    return {
      available: [],
      unavailable: [],
      emulators: [],
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
      emulators: [],
      error: result.error.message,
    };
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status !== 0) {
    return {
      available: [],
      unavailable: [],
      emulators: [],
      error: "adb devices -l failed",
    };
  }

  const deviceLines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices attached"));

  return {
    available: deviceLines.filter(looksLikeAndroidPhysicalDevice).map(redactAndroidDeviceLine),
    unavailable: deviceLines
      .filter((line) => !isAndroidConnectedDevice(line) && !looksLikeAndroidEmulator(line))
      .map(redactAndroidDeviceLine),
    emulators: deviceLines.filter(looksLikeAndroidEmulator).map(redactAndroidDeviceLine),
    error: "",
  };
}

function summarizeDevice(line) {
  return line.replace(/\s+/g, " ").slice(0, 160);
}

function isConnectingOnlyFailure(coreIos) {
  return (
    coreIos &&
    coreIos.unavailable.length > 0 &&
    coreIos.unavailable.every((device) => /\bconnecting\b/i.test(device))
  );
}

function waitForMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function listIosDevicesWithRetry() {
  let ios = listIosDevices();
  let coreIos = listIosCoreDevices();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (ios.available.length > 0 || coreIos.available.length > 0 || !isConnectingOnlyFailure(coreIos)) {
      break;
    }
    waitForMs(1000);
    ios = listIosDevices();
    coreIos = listIosCoreDevices();
  }

  return { ios, coreIos };
}

function run() {
  const platform = targetPlatform();
  const iosState = shouldCheck(platform, "ios") ? listIosDevicesWithRetry() : null;
  const ios = iosState?.ios ?? null;
  const coreIos = iosState?.coreIos ?? null;
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

    if (android.emulators.length > 0) {
      warnings.push(`Android emulator ignored for physical-device gate: ${summarizeDevice(android.emulators[0])}`);
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
