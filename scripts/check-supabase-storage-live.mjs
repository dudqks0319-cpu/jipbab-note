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

function createPublicClient(supabaseUrl, anonKey) {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
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
  const testIdentity = randomUUID();
  const testEmail = `storage-check-${testIdentity}@example.invalid`;
  const testPassword = `Storage-${randomUUID()}-Aa1!`;
  const imageBlob = new Blob([new Uint8Array([137, 80, 78, 71])], {
    type: "image/png",
  });
  const results = [];

  const publicClient = createPublicClient(supabaseUrl, anonKey);
  const admin = createAdminClient(supabaseUrl, serviceRoleKey);
  const created = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error("Storage test user creation failed");
  }

  const userId = created.data.user.id;
  const ownPath = `${userId}/${randomUUID()}.png`;
  const blockedPath = `other-${userId}/${randomUUID()}.png`;
  const publicPath = `public-${testIdentity}/${randomUUID()}.png`;

  try {
    const publicUpload = await publicClient.storage
      .from(BUCKET_ID)
      .upload(publicPath, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (publicUpload.error) {
      addResult(results, "pass", "unauthenticated upload blocked", "public upload was denied");
    } else {
      addResult(results, "fail", "unauthenticated upload blocked", "public upload unexpectedly succeeded");
    }

    const signedClient = createPublicClient(supabaseUrl, anonKey);
    const signedIn = await signedClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signedIn.error || !signedIn.data.user) {
      throw new Error("Storage test user sign-in failed");
    }

    const ownUpload = await signedClient.storage
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
      addResult(results, "pass", "own path upload", "owner-prefixed permanent upload succeeded");
    }

    const crossPrefixUpload = await signedClient.storage
      .from(BUCKET_ID)
      .upload(blockedPath, imageBlob, {
        contentType: "image/png",
        upsert: false,
      });

    if (crossPrefixUpload.error) {
      addResult(results, "pass", "cross-prefix upload blocked", "signed upload outside auth uid prefix was denied");
    } else {
      addResult(
        results,
        "fail",
        "cross-prefix upload blocked",
        "signed upload outside auth uid prefix succeeded; apply the signed-session policy migration",
      );
    }
  } finally {
    await admin.storage.from(BUCKET_ID).remove([ownPath, blockedPath, publicPath]);
    await admin.auth.admin.deleteUser(userId);
  }

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
