import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const cwd = process.cwd();
const envFilePath = path.join(cwd, ".env.local");
const READ_ONLY_DEVICE_ID = "release-check-readonly-device";
const WRITE_TEST_DEVICE_ID = `release-check-write-${Date.now()}`;
const OTHER_DEVICE_ID = `${WRITE_TEST_DEVICE_ID}-other`;
const WRITE_TEST_NAME = `release-check-${Date.now()}`;
const FAMILY_OWNER_DEVICE_ID = `${WRITE_TEST_DEVICE_ID}-family-owner`;
const FAMILY_JOINER_DEVICE_ID = `${WRITE_TEST_DEVICE_ID}-family-joiner`;
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
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
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
    const code = "code" in cause ? cause.code : null;
    const syscall = "syscall" in cause ? cause.syscall : null;
    const hostname = "hostname" in cause ? cause.hostname : null;
    const parts = [error.message, code, syscall, hostname].filter(Boolean);
    return parts.join(" / ");
  }

  return error.message;
}

async function restRequest({
  supabaseUrl,
  anonKey,
  apiKey = anonKey,
  authorizationKey = apiKey,
  pathName,
  method = "GET",
  deviceId,
  body,
  prefer,
}) {
  const url = new URL(`/rest/v1/${pathName}`, supabaseUrl);
  const response = await fetch(url, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authorizationKey}`,
      "Content-Type": "application/json",
      ...(deviceId ? { "x-device-id": deviceId } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
      ...(!prefer && method === "POST" ? { Prefer: "return=representation" } : {}),
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

function firstRow(value) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

async function run() {
  const env = {
    ...readEnvFile(envFilePath),
    ...process.env,
  };
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
  await expectOk(results, "ingredients guest read", {
    supabaseUrl,
    anonKey,
    pathName: "ingredients?select=id,name&limit=1",
    deviceId: READ_ONLY_DEVICE_ID,
  });
  await expectOk(results, "shopping_items guest read", {
    supabaseUrl,
    anonKey,
    pathName: "shopping_items?select=id,name&limit=1",
    deviceId: READ_ONLY_DEVICE_ID,
  });

  if (!writeTestEnabled) {
    addResult(
      results,
      "warn",
      "guest ownership write test",
      "skipped; set SUPABASE_LIVE_WRITE_TEST=1 to insert/delete a temporary ingredient row",
    );
  } else {
    const inserted = await expectOk(results, "ingredients guest insert", {
      supabaseUrl,
      anonKey,
      method: "POST",
      pathName: "ingredients",
      deviceId: WRITE_TEST_DEVICE_ID,
      body: {
        device_id: WRITE_TEST_DEVICE_ID,
        user_id: null,
        name: WRITE_TEST_NAME,
        category: "기타",
        storage_type: "냉장",
        quantity: "1개",
        expiry_date: null,
      },
    });

    const insertedId = Array.isArray(inserted) ? inserted[0]?.id : null;
    if (insertedId) {
      const sameDeviceRows = await expectOk(results, "ingredients same device readback", {
        supabaseUrl,
        anonKey,
        pathName: `ingredients?select=id,name&id=eq.${insertedId}`,
        deviceId: WRITE_TEST_DEVICE_ID,
      });
      if (Array.isArray(sameDeviceRows) && sameDeviceRows.length === 1) {
        addResult(results, "pass", "ingredients same device ownership", "temporary row is visible to owner device");
      } else {
        addResult(results, "fail", "ingredients same device ownership", "temporary row was not visible to owner device");
      }

      const otherDeviceRows = await expectOk(results, "ingredients other device negative read", {
        supabaseUrl,
        anonKey,
        pathName: `ingredients?select=id,name&id=eq.${insertedId}`,
        deviceId: OTHER_DEVICE_ID,
      });
      if (Array.isArray(otherDeviceRows) && otherDeviceRows.length === 0) {
        addResult(results, "pass", "ingredients cross-device isolation", "temporary row is hidden from another device");
      } else {
        addResult(results, "fail", "ingredients cross-device isolation", "temporary row leaked to another device");
      }

      await expectOk(results, "ingredients guest delete cleanup", {
        supabaseUrl,
        anonKey,
        method: "DELETE",
        pathName: `ingredients?id=eq.${insertedId}`,
        deviceId: WRITE_TEST_DEVICE_ID,
      });
    } else {
      addResult(results, "fail", "ingredients guest insert id", "temporary insert did not return an id");
    }

    if (!serviceRoleKey) {
      addResult(
        results,
        "warn",
        "family service-role live write",
        "skipped; SUPABASE_SERVICE_ROLE_KEY is required for cleanup",
      );
    } else {
      const familyGroupId = randomUUID();
      let shouldCleanupFamilyGroup = false;

      try {
        const createdFamilyRows = await expectOk(results, "family group service insert", {
          supabaseUrl,
          anonKey,
          apiKey: serviceRoleKey,
          authorizationKey: serviceRoleKey,
          method: "POST",
          pathName: "family_groups",
          deviceId: FAMILY_OWNER_DEVICE_ID,
          body: {
            id: familyGroupId,
            owner_user_id: null,
            owner_device_id: FAMILY_OWNER_DEVICE_ID,
            name: "release check family fridge",
            invite_code: FAMILY_INVITE_CODE,
          },
        });
        const createdFamily = firstRow(createdFamilyRows);

        if (createdFamily?.id === familyGroupId && createdFamily?.invite_code === FAMILY_INVITE_CODE) {
          shouldCleanupFamilyGroup = true;
          addResult(results, "pass", "family group service insert payload", "created group id and invite code match");
        } else {
          addResult(results, "fail", "family group service insert payload", "created group did not return the expected id/code");
        }

        await expectOk(results, "family owner member service insert", {
          supabaseUrl,
          anonKey,
          apiKey: serviceRoleKey,
          authorizationKey: serviceRoleKey,
          method: "POST",
          pathName: "family_members",
          deviceId: FAMILY_OWNER_DEVICE_ID,
          body: {
            family_group_id: familyGroupId,
            user_id: null,
            device_id: FAMILY_OWNER_DEVICE_ID,
            display_name: "release-owner",
            role: "owner",
          },
        });

        await expectOk(results, "family joiner member service insert", {
          supabaseUrl,
          anonKey,
          apiKey: serviceRoleKey,
          authorizationKey: serviceRoleKey,
          method: "POST",
          pathName: "family_members",
          deviceId: FAMILY_JOINER_DEVICE_ID,
          body: {
            family_group_id: familyGroupId,
            user_id: null,
            device_id: FAMILY_JOINER_DEVICE_ID,
            display_name: "release-joiner",
            role: "member",
          },
        });

        const members = await expectOk(results, "family members service readback", {
          supabaseUrl,
          anonKey,
          apiKey: serviceRoleKey,
          authorizationKey: serviceRoleKey,
          pathName: `family_members?select=id,device_id,role&family_group_id=eq.${familyGroupId}`,
        });

        if (Array.isArray(members) && members.length === 2) {
          addResult(results, "pass", "family members service readback count", "owner and joiner rows were stored");
        } else {
          addResult(results, "fail", "family members service readback count", "expected owner and joiner rows");
        }

        const familyIngredientRows = await expectOk(results, "family ingredient member insert", {
          supabaseUrl,
          anonKey,
          method: "POST",
          pathName: "ingredients",
          deviceId: FAMILY_OWNER_DEVICE_ID,
          body: {
            device_id: FAMILY_OWNER_DEVICE_ID,
            user_id: null,
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
          const joinerIngredientRows = await expectOk(results, "family ingredient joiner read", {
            supabaseUrl,
            anonKey,
            pathName: `ingredients?select=id,name&id=eq.${familyIngredientId}`,
            deviceId: FAMILY_JOINER_DEVICE_ID,
          });
          if (Array.isArray(joinerIngredientRows) && joinerIngredientRows.length === 1) {
            addResult(results, "pass", "family ingredient member visibility", "joiner can read shared family ingredient");
          } else {
            addResult(results, "fail", "family ingredient member visibility", "joiner could not read shared family ingredient");
          }

          const otherIngredientRows = await expectOk(results, "family ingredient non-member read", {
            supabaseUrl,
            anonKey,
            pathName: `ingredients?select=id,name&id=eq.${familyIngredientId}`,
            deviceId: OTHER_DEVICE_ID,
          });
          if (Array.isArray(otherIngredientRows) && otherIngredientRows.length === 0) {
            addResult(results, "pass", "family ingredient non-member isolation", "non-member cannot read shared family ingredient");
          } else {
            addResult(results, "fail", "family ingredient non-member isolation", "family ingredient leaked to non-member");
          }
        } else {
          addResult(results, "fail", "family ingredient insert id", "temporary family ingredient did not return an id");
        }

        const familyShoppingRows = await expectOk(results, "family shopping member insert", {
          supabaseUrl,
          anonKey,
          method: "POST",
          pathName: "shopping_items",
          deviceId: FAMILY_OWNER_DEVICE_ID,
          body: {
            device_id: FAMILY_OWNER_DEVICE_ID,
            user_id: null,
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
          const joinerShoppingRows = await expectOk(results, "family shopping joiner read", {
            supabaseUrl,
            anonKey,
            pathName: `shopping_items?select=id,name&id=eq.${familyShoppingId}`,
            deviceId: FAMILY_JOINER_DEVICE_ID,
          });
          if (Array.isArray(joinerShoppingRows) && joinerShoppingRows.length === 1) {
            addResult(results, "pass", "family shopping member visibility", "joiner can read shared family shopping item");
          } else {
            addResult(results, "fail", "family shopping member visibility", "joiner could not read shared family shopping item");
          }

          const otherShoppingRows = await expectOk(results, "family shopping non-member read", {
            supabaseUrl,
            anonKey,
            pathName: `shopping_items?select=id,name&id=eq.${familyShoppingId}`,
            deviceId: OTHER_DEVICE_ID,
          });
          if (Array.isArray(otherShoppingRows) && otherShoppingRows.length === 0) {
            addResult(results, "pass", "family shopping non-member isolation", "non-member cannot read shared family shopping item");
          } else {
            addResult(results, "fail", "family shopping non-member isolation", "family shopping item leaked to non-member");
          }
        } else {
          addResult(results, "fail", "family shopping insert id", "temporary family shopping item did not return an id");
        }
      } finally {
        if (shouldCleanupFamilyGroup) {
          await expectOk(results, "family group cleanup", {
            supabaseUrl,
            anonKey,
            apiKey: serviceRoleKey,
            authorizationKey: serviceRoleKey,
            method: "DELETE",
            pathName: `family_groups?id=eq.${familyGroupId}`,
          });
        }
      }
    }
  }

  const failures = results.filter((item) => item.level === "fail");
  const warnings = results.filter((item) => item.level === "warn");
  const passes = results.filter((item) => item.level === "pass");

  console.log("Supabase live REST check");
  console.log(`Passes: ${passes.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Failures: ${failures.length}`);

  for (const [title, items] of [
    ["PASS", passes],
    ["WARN", warnings],
    ["FAIL", failures],
  ]) {
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
