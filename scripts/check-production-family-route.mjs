import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envFilePath = path.join(cwd, ".env.local");
const DEFAULT_PRODUCTION_URL = "https://jipbab-note-app.vercel.app";
const requiredVercelEnv = ["SUPABASE_SERVICE_ROLE_KEY", "ADMIN_EMAILS"];

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

function requiredEnv(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is missing`);
  }
  return value;
}

function normalizeBaseUrl(value) {
  const raw = value?.trim() || DEFAULT_PRODUCTION_URL;
  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("production app URL must use HTTPS");
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function safeMessage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  const message = value.message;
  return typeof message === "string" ? ` message=${message.replace(/\s+/g, " ").slice(0, 120)}` : "";
}

function hasProductionEnv(output, name) {
  return output
    .split(/\r?\n/)
    .some((line) => line.trim().startsWith(name) && /\bProduction\b/.test(line));
}

function assertVercelProductionServerEnv() {
  const result = spawnSync("vercel", ["env", "ls"], {
    cwd,
    encoding: "utf8",
  });

  if (result.error) {
    throw new Error(`unable to list Vercel Production env: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error("unable to list Vercel Production env");
  }

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const missing = requiredVercelEnv.filter((name) => !hasProductionEnv(output, name));
  if (missing.length > 0) {
    throw new Error(`Vercel Production env missing: ${missing.join(", ")}`);
  }
}

async function postFamilyAction({ productionUrl, action, deviceId, body }) {
  const response = await fetch(`${productionUrl}/api/family-groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    throw new Error(`${action} failed: HTTP ${response.status}${safeMessage(json)}`);
  }

  return json;
}

async function cleanupFamilyGroup({ supabaseUrl, serviceRoleKey, groupId }) {
  const url = new URL(`/rest/v1/family_groups?id=eq.${groupId}`, supabaseUrl);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`cleanup failed: HTTP ${response.status}`);
  }
}

async function run() {
  assertVercelProductionServerEnv();

  const env = {
    ...readEnvFile(envFilePath),
    ...process.env,
  };
  const productionUrl = normalizeBaseUrl(env.PRODUCTION_APP_URL || env.CAPACITOR_SERVER_URL);
  const supabaseUrl = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const groupId = randomUUID();
  const inviteCode = `QA${randomBytes(3).toString("hex").toUpperCase()}`;
  const ownerDeviceId = `qa-owner-${randomBytes(4).toString("hex")}`;
  const joinerDeviceId = `qa-joiner-${randomBytes(4).toString("hex")}`;

  let cleanupError = null;
  try {
    const created = await postFamilyAction({
      productionUrl,
      action: "create",
      deviceId: ownerDeviceId,
      body: {
        groupId,
        groupName: "Release QA family",
        inviteCode,
        displayName: "Owner",
      },
    });

    if (created?.group?.id !== groupId) {
      throw new Error("create response group id mismatch");
    }

    const joined = await postFamilyAction({
      productionUrl,
      action: "join",
      deviceId: joinerDeviceId,
      body: {
        inviteCode,
        displayName: "Joiner",
      },
    });

    const memberCount = Array.isArray(joined?.group?.members) ? joined.group.members.length : 0;
    if (joined?.group?.id !== groupId || memberCount < 2) {
      throw new Error("join response did not include both family members");
    }

    console.log("Production family route check");
    console.log("Passes: 4");
    console.log("Failures: 0");
    console.log("\nPASS");
    console.log("- create route returned the expected group id");
    console.log("- join route returned the expected group id");
    console.log("- join route returned owner and joiner members");
  } finally {
    try {
      await cleanupFamilyGroup({ supabaseUrl, serviceRoleKey, groupId });
    } catch (error) {
      cleanupError = error instanceof Error ? error.message : "unknown cleanup error";
    }
    if (cleanupError) {
      console.error(`- cleanup: failed (${cleanupError})`);
      process.exitCode = 1;
    } else {
      console.log("- cleanup: temporary family group deleted");
    }
  }
}

run().catch((error) => {
  console.error("Production family route check");
  console.error("Passes: 0");
  console.error("Failures: 1");
  console.error(`\nFAIL\n- ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
});
