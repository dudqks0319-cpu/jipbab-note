import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isProduction = process.env.NODE_ENV === "production";
const scriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const connectSrc = isProduction
  ? "connect-src 'self' https://*.supabase.co https://openapi.foodsafetykorea.go.kr https://world.openfoodfacts.org"
  : "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.supabase.co https://openapi.foodsafetykorea.go.kr https://world.openfoodfacts.org";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; ${connectSrc}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
