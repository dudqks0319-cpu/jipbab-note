// 바코드 외부 조회를 인증·분산 쿼터·타임아웃·서킷 브레이커로 비용 안전하게 제한합니다.
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { isValidFoodBarcode, normalizeBarcode } from "@/lib/barcode";
import {
  CostOperationError,
  runCostBoundedOperation,
} from "@/lib/cost-bounded-operation";
import {
  consumeDistributedRateLimit,
  consumeDistributedRateLimitForKey,
  type DistributedRateLimitResult,
} from "@/lib/distributed-rate-limit";
import { noStoreHeaders, normalizeHttpUrl } from "@/lib/request-security";
import {
  getAuthenticatedServerUser,
  isMissingServerSupabaseConfigError,
} from "@/lib/supabase-server";

const OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product";
const OPEN_FOOD_FACTS_FIELDS = [
  "code",
  "product_name",
  "product_name_ko",
  "brands",
  "quantity",
  "categories",
  "image_url",
] as const;
const MAX_PROVIDER_RESPONSE_BYTES = 128 * 1024;
const COST_GUARD_HEADERS = {
  ...noStoreHeaders(),
  "X-Cost-Guard": "active",
};

type ProductLookupResult = {
  barcode: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  category: string | null;
  imageUrl: string | null;
  source: "openfoodfacts" | "stub";
};

type OpenFoodFactsPayload = {
  status?: number;
  product?: {
    product_name?: string;
    product_name_ko?: string;
    brands?: string;
    quantity?: string;
    categories?: string;
    image_url?: string;
  };
};

function toTrimmedOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOpenFoodFactsProduct(
  barcode: string,
  payload: OpenFoodFactsPayload,
): ProductLookupResult | null {
  if (payload.status !== 1 || !payload.product) return null;

  const name = toTrimmedOrNull(payload.product.product_name_ko)
    ?? toTrimmedOrNull(payload.product.product_name);
  if (!name) return null;

  return {
    barcode,
    name,
    brand: toTrimmedOrNull(payload.product.brands),
    quantity: toTrimmedOrNull(payload.product.quantity),
    category: toTrimmedOrNull(payload.product.categories),
    imageUrl: normalizeHttpUrl(payload.product.image_url),
    source: "openfoodfacts",
  };
}

async function fetchFromOpenFoodFacts(
  barcode: string,
  signal: AbortSignal,
): Promise<ProductLookupResult | null> {
  const endpoint = `${OPEN_FOOD_FACTS_URL}/${encodeURIComponent(barcode)}.json?fields=${OPEN_FOOD_FACTS_FIELDS.join(",")}`;
  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
    next: { revalidate: 86_400 },
    signal,
  });
  if (!response.ok) return null;

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new Error("Open Food Facts response exceeded the configured size limit.");
  }
  const payload = JSON.parse(text) as OpenFoodFactsPayload;
  return parseOpenFoodFactsProduct(barcode, payload);
}

function rateLimitResponse(rateLimit: DistributedRateLimitResult): NextResponse | null {
  if (rateLimit.status === "allowed") return null;
  if (rateLimit.status === "limited") {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: { ...COST_GUARD_HEADERS, "Retry-After": String(rateLimit.retryAfter) },
      },
    );
  }
  return NextResponse.json(
    { message: "상품 조회 보호 기능을 확인 중입니다. 잠시 후 다시 시도해 주세요." },
    {
      status: 503,
      headers: { ...COST_GUARD_HEADERS, "Retry-After": String(rateLimit.retryAfter) },
    },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const normalizedBarcode = normalizeBarcode(searchParams.get("barcode"));
  if (!normalizedBarcode || !isValidFoodBarcode(normalizedBarcode)) {
    return NextResponse.json(
      { message: "유효한 바코드(숫자 8~14자리)를 전달해 주세요." },
      { status: 400, headers: COST_GUARD_HEADERS },
    );
  }

  const preAuthLimit = await consumeDistributedRateLimit(request, "products:lookup:pre-auth", {
    limit: 20,
    windowSeconds: 60,
    dailyLimit: 200,
    globalLimit: 200,
    globalDailyLimit: 2_000,
  });
  const preAuthResponse = rateLimitResponse(preAuthLimit);
  if (preAuthResponse) return preAuthResponse;

  let user: User | null;
  try {
    user = await getAuthenticatedServerUser(request.headers.get("authorization"));
  } catch (error) {
    if (isMissingServerSupabaseConfigError(error)) {
      return NextResponse.json(
        { message: "상품 조회 로그인을 준비 중입니다. 수동 입력을 이용해 주세요." },
        { status: 503, headers: COST_GUARD_HEADERS },
      );
    }
    return NextResponse.json(
      { message: "로그인 세션을 확인하지 못했습니다. 수동 입력을 이용해 주세요." },
      { status: 503, headers: COST_GUARD_HEADERS },
    );
  }
  if (!user) {
    return NextResponse.json(
      { message: "서명된 게스트 또는 로그인 세션이 필요합니다." },
      { status: 401, headers: COST_GUARD_HEADERS },
    );
  }

  const userLimit = await consumeDistributedRateLimitForKey(
    "products:lookup:user:burst",
    `user:${user.id}`,
    { limit: 20, windowSeconds: 60 },
  );
  const userDailyLimit = userLimit.status === "allowed"
    ? await consumeDistributedRateLimitForKey(
        "products:lookup:user:daily",
        `user:${user.id}`,
        { limit: 200, windowSeconds: 86_400 },
      )
    : userLimit;
  const userLimitResponse = rateLimitResponse(userDailyLimit);
  if (userLimitResponse) return userLimitResponse;

  try {
    const product = await runCostBoundedOperation(
      "openfoodfacts:product-lookup",
      {
        maxConcurrent: 4,
        timeoutMs: 4_000,
        failureThreshold: 5,
        cooldownMs: 60_000,
      },
      (signal) => fetchFromOpenFoodFacts(normalizedBarcode, signal),
    );
    if (product) {
      return NextResponse.json(
        {
          barcode: normalizedBarcode,
          product,
          source: product.source,
          message: "상품 정보를 조회했습니다.",
        },
        { headers: COST_GUARD_HEADERS },
      );
    }
  } catch (error) {
    if (!(error instanceof CostOperationError)) {
      return NextResponse.json(
        {
          barcode: normalizedBarcode,
          product: null,
          source: "stub",
          message: "상품 정보를 확인하지 못했습니다. 수동 입력으로 진행해 주세요.",
        },
        { headers: COST_GUARD_HEADERS },
      );
    }
  }

  return NextResponse.json(
    {
      barcode: normalizedBarcode,
      product: null,
      source: "stub",
      message: "외부 상품 정보를 찾지 못했습니다. 스캔 코드를 유지한 채 수동 입력으로 진행해 주세요.",
    },
    { headers: COST_GUARD_HEADERS },
  );
}
