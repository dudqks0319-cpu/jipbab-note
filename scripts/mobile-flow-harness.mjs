#!/usr/bin/env node

const baseUrl = new URL(process.env.BASE_URL ?? "http://127.0.0.1:3001");
const deviceId = process.env.HARNESS_DEVICE_ID ?? "jipbab-mobile-flow-harness";

const checks = [];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const makeUrl = (path) => new URL(path, baseUrl).toString();

const record = (name, passed, detail) => {
  checks.push({ name, passed, detail });
  const marker = passed ? "PASS" : "FAIL";
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`);
};

const expect = (condition, name, detail) => {
  if (!condition) {
    record(name, false, detail);
    return false;
  }
  record(name, true, detail);
  return true;
};

const fetchWithHeaders = async (path) => {
  const response = await fetch(makeUrl(path), {
    headers: {
      "user-agent": "jipbab-mobile-flow-harness/1.0",
      "x-device-id": deviceId,
    },
  });
  return response;
};

const fetchText = async (path) => {
  const response = await fetchWithHeaders(path);
  const text = await response.text();
  return { response, text };
};

const fetchJson = async (path) => {
  const response = await fetchWithHeaders(path);
  const json = await response.json();
  return { response, json };
};

const waitForServer = async () => {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetchWithHeaders("/");
      if (response.ok) {
        record("server ready", true, `${baseUrl.origin} responded ${response.status}`);
        return;
      }
    } catch {
      // 다음 attempt에서 다시 확인합니다.
    }
    await wait(500);
  }

  throw new Error(`Server did not respond at ${baseUrl.origin}`);
};

const assertPage = async ({ name, path, tokens }) => {
  const { response, text } = await fetchText(path);
  expect(response.status === 200, `${name} status`, `${path} -> ${response.status}`);

  for (const token of tokens) {
    expect(text.includes(token), `${name} contains "${token}"`, path);
  }
};

const run = async () => {
  await waitForServer();

  await assertPage({
    name: "home onboarding",
    path: "/",
    tokens: ["BEGINNER KITCHEN", "재료 3개", "장보기"],
  });

  await assertPage({
    name: "recipe tab",
    path: "/recipe",
    tokens: ["레시피", "장보기"],
  });

  await assertPage({
    name: "shopping handoff",
    path: `/shopping?items=${encodeURIComponent("돼지고기,양파")}`,
    tokens: ["장보기", "돼지고기", "양파"],
  });

  await assertPage({
    name: "barcode manual fallback",
    path: "/barcode",
    tokens: ["바코드", "냉장고"],
  });

  const recipeApi = await fetchJson("/api/recipes?size=4");
  expect(recipeApi.response.status === 200, "recipes api fallback status", String(recipeApi.response.status));
  expect(Array.isArray(recipeApi.json.recipes), "recipes api returns array", `count=${recipeApi.json.recipes?.length ?? 0}`);

  const ingredientApi = await fetchJson(`/api/ingredients?category=${encodeURIComponent("채소")}&limit=5`);
  expect(ingredientApi.response.status === 200, "ingredients api fallback status", String(ingredientApi.response.status));
  expect(Array.isArray(ingredientApi.json.items), "ingredients api returns items", `count=${ingredientApi.json.items?.length ?? 0}`);
  expect(
    ingredientApi.json.items?.includes("양파"),
    'ingredients api includes "양파"',
    ingredientApi.json.scannedFrom ?? "unknown source",
  );

  const productApi = await fetchJson("/api/products?barcode=8800000000000");
  expect(productApi.response.status === 200, "products api fallback status", String(productApi.response.status));
  expect(productApi.json.product === null, "products api keeps manual-add path", productApi.json.source ?? "unknown source");

  const failed = checks.filter((check) => !check.passed);
  console.log("");
  console.log(`RESULT ${checks.length - failed.length}/${checks.length} checks passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(`FAIL harness crashed - ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
