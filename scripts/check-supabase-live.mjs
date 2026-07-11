import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const cwd = process.cwd();
const envFilePath = path.join(cwd, ".env.local");
const WRITE_TEST_NAME = `release-check-${Date.now()}`;
const FAMILY_INVITE_CODE = `RC${Date.now().toString(36).slice(-6).toUpperCase()}`.slice(0, 8);

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
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    pairs[key] = value;
  }
  return pairs;
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "<invalid-url>";
  }
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

function formatError(error) {
  if (!(error instanceof Error)) {
    return "unknown error";
  }
  const cause = error.cause;
  if (cause && typeof cause === "object") {
    const parts = [
      error.message,
      "code" in cause ? cause.code : null,
      "syscall" in cause ? cause.syscall : null,
      "hostname" in cause ? cause.hostname : null,
    ].filter(Boolean);
    return parts.join(" / ");
  }
  return error.message;
}

function summarizeRestError(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  const parts = [];
  for (const key of ["code", "message", "details", "hint"]) {
    const item = value[key];
    if (typeof item === "string" && item.trim()) {
      parts.push(`${key}=${item.trim().replace(/\s+/g, " ").slice(0, 180)}`);
    }
  }
  return parts.length > 0 ? ` (${parts.join("; ")})` : "";
}

async function restRequest({
  supabaseUrl,
  anonKey,
  apiKey = anonKey,
  authorizationKey = apiKey,
  pathName,
  method = "GET",
  body,
  prefer,
  headers: extraHeaders,
}) {
  const url = new URL(`/rest/v1/${pathName}`, supabaseUrl);
  const response = await fetch(url, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authorizationKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
      ...(!prefer && method === "POST" ? { Prefer: "return=representation" } : {}),
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }
  return { response, json };
}

async function expectOk(results, label, requestOptions) {
  const { response, json } = await restRequest(requestOptions);
  if (response.ok) {
    addResult(results, "pass", label, `HTTP ${response.status}`);
    return json;
  }
  addResult(results, "fail", label, `HTTP ${response.status}${summarizeRestError(json)}`);
  return null;
}

async function createSignedTestUser(admin, supabaseUrl, anonKey, label) {
  const token = randomUUID();
  const email = `rls-${label}-${token}@example.invalid`;
  const password = `Rls-${randomUUID()}-Aa1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    throw new Error(`test user creation failed: ${label}`);
  }
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    throw new Error(`test user sign-in failed: ${label}`);
  }
  return {
    id: created.data.user.id,
    accessToken: signedIn.data.session.access_token,
  };
}

function expectRowCount(results, label, rows, expected) {
  if (Array.isArray(rows) && rows.length === expected) {
    addResult(results, "pass", label, `row count ${expected}`);
  } else {
    addResult(results, "fail", label, `expected ${expected} row(s)`);
  }
}

async function runSignedIsolationChecks({ supabaseUrl, anonKey, serviceRoleKey, results }) {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const users = [];
  const cleanupPaths = [];

  try {
    const owner = await createSignedTestUser(admin, supabaseUrl, anonKey, "owner");
    const joiner = await createSignedTestUser(admin, supabaseUrl, anonKey, "joiner");
    const outsider = await createSignedTestUser(admin, supabaseUrl, anonKey, "outsider");
    users.push(owner, joiner, outsider);

    const personalDeviceMarker = `signed:${randomUUID()}`;
    const inserted = await expectOk(results, "ingredients signed insert", {
      supabaseUrl,
      anonKey,
      authorizationKey: owner.accessToken,
      method: "POST",
      pathName: "ingredients",
      body: {
        device_id: personalDeviceMarker,
        user_id: owner.id,
        name: WRITE_TEST_NAME,
        category: "기타",
        storage_type: "냉장",
        quantity: "1개",
        expiry_date: null,
      },
    });
    const personalId = Array.isArray(inserted) ? inserted[0]?.id : null;
    if (!personalId) {
      addResult(results, "fail", "ingredients signed insert id", "temporary insert did not return an id");
    } else {
      cleanupPaths.push(["ingredients", personalId]);
      const ownerRows = await expectOk(results, "ingredients owner readback", {
        supabaseUrl,
        anonKey,
        authorizationKey: owner.accessToken,
        pathName: `ingredients?select=id&id=eq.${personalId}`,
      });
      expectRowCount(results, "ingredients same-user ownership", ownerRows, 1);

      const forgedRows = await expectOk(results, "ingredients forged device negative read", {
        supabaseUrl,
        anonKey,
        authorizationKey: outsider.accessToken,
        headers: { "x-device-id": personalDeviceMarker },
        pathName: `ingredients?select=id&id=eq.${personalId}`,
      });
      expectRowCount(results, "ingredients cross-user isolation", forgedRows, 0);
    }

    const familyGroupId = randomUUID();
    cleanupPaths.push(["family_groups", familyGroupId]);
    await expectOk(results, "family group service insert", {
      supabaseUrl,
      anonKey,
      apiKey: serviceRoleKey,
      authorizationKey: serviceRoleKey,
      method: "POST",
      pathName: "family_groups",
      body: {
        id: familyGroupId,
        owner_user_id: owner.id,
        owner_device_id: `signed:${randomUUID()}`,
        name: "release check family fridge",
        invite_code: FAMILY_INVITE_CODE,
      },
    });

    for (const [user, role] of [[owner, "owner"], [joiner, "member"]]) {
      await expectOk(results, `family ${role} member service insert`, {
        supabaseUrl,
        anonKey,
        apiKey: serviceRoleKey,
        authorizationKey: serviceRoleKey,
        method: "POST",
        pathName: "family_members",
        body: {
          family_group_id: familyGroupId,
          user_id: user.id,
          device_id: `signed:${randomUUID()}`,
          display_name: `release-${role}`,
          role,
        },
      });
    }

    const familyIngredientRows = await expectOk(results, "family ingredient member insert", {
      supabaseUrl,
      anonKey,
      authorizationKey: owner.accessToken,
      method: "POST",
      pathName: "ingredients",
      body: {
        device_id: `signed:${randomUUID()}`,
        user_id: owner.id,
        family_group_id: familyGroupId,
        name: `${WRITE_TEST_NAME}-family-ingredient`,
        category: "기타",
        storage_type: "냉장",
        quantity: "1개",
        expiry_date: null,
      },
    });
    const familyIngredientId = Array.isArray(familyIngredientRows) ? familyIngredientRows[0]?.id : null;
    if (familyIngredientId) {
      const joinerRows = await expectOk(results, "family ingredient joiner read", {
        supabaseUrl,
        anonKey,
        authorizationKey: joiner.accessToken,
        pathName: `ingredients?select=id&id=eq.${familyIngredientId}`,
      });
      expectRowCount(results, "family ingredient member visibility", joinerRows, 1);
      const outsiderRows = await expectOk(results, "family ingredient non-member read", {
        supabaseUrl,
        anonKey,
        authorizationKey: outsider.accessToken,
        pathName: `ingredients?select=id&id=eq.${familyIngredientId}`,
      });
      expectRowCount(results, "family ingredient non-member isolation", outsiderRows, 0);
    }

    const familyShoppingRows = await expectOk(results, "family shopping member insert", {
      supabaseUrl,
      anonKey,
      authorizationKey: owner.accessToken,
      method: "POST",
      pathName: "shopping_items",
      body: {
        device_id: `signed:${randomUUID()}`,
        user_id: owner.id,
        family_group_id: familyGroupId,
        name: `${WRITE_TEST_NAME}-family-shopping`,
        quantity: "1개",
        category: "기타",
        checked: false,
        source_recipe_id: "release-check",
        source_recipe_name: "release check recipe",
      },
    });
    const familyShoppingId = Array.isArray(familyShoppingRows) ? familyShoppingRows[0]?.id : null;
    if (familyShoppingId) {
      const joinerRows = await expectOk(results, "family shopping joiner read", {
        supabaseUrl,
        anonKey,
        authorizationKey: joiner.accessToken,
        pathName: `shopping_items?select=id&id=eq.${familyShoppingId}`,
      });
      expectRowCount(results, "family shopping member visibility", joinerRows, 1);
      const outsiderRows = await expectOk(results, "family shopping non-member read", {
        supabaseUrl,
        anonKey,
        authorizationKey: outsider.accessToken,
        pathName: `shopping_items?select=id&id=eq.${familyShoppingId}`,
      });
      expectRowCount(results, "family shopping non-member isolation", outsiderRows, 0);
    }
  } finally {
    for (const [tableName, id] of cleanupPaths.reverse()) {
      await restRequest({
        supabaseUrl,
        anonKey,
        apiKey: serviceRoleKey,
        authorizationKey: serviceRoleKey,
        method: "DELETE",
        pathName: `${tableName}?id=eq.${id}`,
      });
    }
    for (const user of users) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

async function run() {
  const env = { ...readEnvFile(envFilePath), ...process.env };
  const supabaseUrl = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requiredEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const writeTestEnabled = env.SUPABASE_LIVE_WRITE_TEST === "1";
  const results = [];

  addResult(results, "pass", "Supabase URL", redactUrl(supabaseUrl));
  await expectOk(results, "recipes anon read", {
    supabaseUrl,
    anonKey,
    pathName: "recipes?select=id,title&limit=1",
  });
  await expectOk(results, "recipe_sources anon read", {
    supabaseUrl,
    anonKey,
    pathName: "recipe_sources?select=id,provider,title&limit=1",
  });
  await expectOk(results, "partner_links active anon read", {
    supabaseUrl,
    anonKey,
    pathName: "partner_links?select=id,kind,active&active=eq.true&limit=1",
  });

  const publicIngredients = await expectOk(results, "ingredients unauthenticated read", {
    supabaseUrl,
    anonKey,
    pathName: "ingredients?select=id&limit=1",
    headers: { "x-device-id": "forged-device" },
  });
  expectRowCount(results, "ingredients unauthenticated isolation", publicIngredients, 0);
  const publicShopping = await expectOk(results, "shopping_items unauthenticated read", {
    supabaseUrl,
    anonKey,
    pathName: "shopping_items?select=id&limit=1",
    headers: { "x-device-id": "forged-device" },
  });
  expectRowCount(results, "shopping_items unauthenticated isolation", publicShopping, 0);

  if (!writeTestEnabled) {
    addResult(results, "warn", "signed ownership write test", "skipped; set SUPABASE_LIVE_WRITE_TEST=1");
  } else if (!serviceRoleKey) {
    addResult(results, "fail", "signed ownership write test", "SUPABASE_SERVICE_ROLE_KEY is required");
  } else {
    await runSignedIsolationChecks({ supabaseUrl, anonKey, serviceRoleKey, results });
  }

  const failures = results.filter((item) => item.level === "fail");
  const warnings = results.filter((item) => item.level === "warn");
  const passes = results.filter((item) => item.level === "pass");
  console.log("Supabase live REST check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Failures: ${failures.length}`);
  for (const [title, items] of [["PASS", passes], ["WARN", warnings], ["FAIL", failures]]) {
    if (items.length === 0) {
      continue;
    }
    console.log(`\n${title}`);
    for (const item of items) {
      console.log(`- ${item.label}: ${item.detail}`);
    }
  }
  if (failures.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(`Supabase live REST check failed: ${formatError(error)}`);
  process.exit(1);
});
