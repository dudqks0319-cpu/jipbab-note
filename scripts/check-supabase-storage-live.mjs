// 이 파일은 운영 Supabase Storage 이미지 버킷의 path 소유권 정책을 확인합니다.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const envFilePath = ".env.local";
const BUCKET_ID = "community-images";

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
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    pairs[key] = value;
  }

  return pairs;
}

function addResult(results, level, label, detail) {
  results.push({ level, label, detail });
}

function requiredEnv(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is missing`);
  }
  return value;
}

function createAnonClient(supabaseUrl, anonKey, deviceId) {
  const fetchWithDeviceHeader = (input, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set("x-device-id", deviceId);
    return fetch(input, { ...init, headers });
  };

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchWithDeviceHeader,
    },
  });
}

function createAdminClient(supabaseUrl, serviceRoleKey) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function run() {
  const env = {
    ...readEnvFile(envFilePath),
    ...process.env,
  };
  const supabaseUrl = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const deviceId = `release-storage-${Date.now()}`;
  const ownPath = `${deviceId}/${randomUUID()}.png`;
  const blockedPath = `other-${deviceId}/${randomUUID()}.png`;
  const imageBlob = new Blob([new Uint8Array([137, 80, 78, 71])], {
    type: "image/png",
  });
  const results = [];

  const anon = createAnonClient(supabaseUrl, anonKey, deviceId);
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);

  const ownUpload = await anon.storage
    .from(BUCKET_ID)
    .upload(ownPath, imageBlob, {
      contentType: "image/png",
      upsert: false,
    });

  if (ownUpload.error) {
    addResult(
      results,
      "fail",
      "own path upload",
      `expected owner-prefixed upload to succeed; got ${ownUpload.error.statusCode ?? "unknown"}`,
    );
  } else {
    addResult(results, "pass", "own path upload", "owner-prefixed guest upload succeeded");
  }

  const crossPrefixUpload = await anon.storage
    .from(BUCKET_ID)
    .upload(blockedPath, imageBlob, {
      contentType: "image/png",
      upsert: false,
    });

  if (crossPrefixUpload.error) {
    addResult(results, "pass", "cross-prefix upload blocked", "guest upload outside device prefix was denied");
  } else {
    addResult(
      results,
      "fail",
      "cross-prefix upload blocked",
      "guest upload outside device prefix succeeded; apply the Storage path policy migration",
    );
  }

  await admin.storage.from(BUCKET_ID).remove([ownPath, blockedPath]);

  const passes = results.filter((result) => result.level === "pass");
  const failures = results.filter((result) => result.level === "fail");

  console.log("Supabase Storage live policy check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Failures: ${failures.length}`);

  if (passes.length > 0) {
    console.log("\nPASS");
    for (const result of passes) {
      console.log(`- ${result.label}: ${result.detail}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFAIL");
    for (const result of failures) {
      console.log(`- ${result.label}: ${result.detail}`);
    }
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
