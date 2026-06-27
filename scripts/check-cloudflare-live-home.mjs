function normalizeBaseUrl(value) {
  const raw = value?.trim();
  if (!raw) {
    throw new Error("Set PRODUCTION_APP_URL or CAPACITOR_SERVER_URL to the Cloudflare app URL");
  }
  const url = new URL(raw);
  if (url.protocol !== "https:") {
    throw new Error("Cloudflare app URL must use HTTPS");
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function run() {
  const baseUrl = normalizeBaseUrl(
    process.env.PRODUCTION_APP_URL || process.env.CAPACITOR_SERVER_URL,
  );
  const response = await fetch(baseUrl, {
    headers: { Accept: "text/html" },
  });
  const html = await response.text();

  console.log("Cloudflare live home check");
  console.log(`URL: ${baseUrl}`);
  console.log(`HTTP: ${response.status}`);

  if (!response.ok) {
    console.error("FAIL");
    console.error("- Cloudflare home did not return 2xx");
    process.exit(1);
  }

  const forbiddenLoaderTexts = [
    "집밥노트 불러오는 중",
    "원격 앱 연결을 확인하는 중입니다",
    "원격 앱으로 연결합니다",
  ];
  const foundLoaderText = forbiddenLoaderTexts.find((text) => html.includes(text));
  if (foundLoaderText) {
    console.error("FAIL");
    console.error(`- Cloudflare home is still serving bootstrap loader text: ${foundLoaderText}`);
    process.exit(1);
  }

  const expectedAppTexts = ["집밥노트", "냉장고", "레시피", "장보기"];
  const matched = expectedAppTexts.filter((text) => html.includes(text));
  if (matched.length < 2) {
    console.error("FAIL");
    console.error("- Cloudflare home does not look like the real app shell");
    process.exit(1);
  }

  console.log("PASS");
  console.log(`- app shell markers found: ${matched.join(", ")}`);
}

run().catch((error) => {
  console.error("Cloudflare live home check");
  console.error("FAIL");
  console.error(`- ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
});
