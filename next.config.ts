import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const scriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline' https://t1.kakaocdn.net"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.kakaocdn.net";

const connectSrc = isProduction
  ? "connect-src 'self' https://*.supabase.co https://openapi.foodsafetykorea.go.kr https://world.openfoodfacts.org https://*.kakao.com https://*.kakaocdn.net"
  : "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://*.supabase.co https://openapi.foodsafetykorea.go.kr https://world.openfoodfacts.org https://*.kakao.com https://*.kakaocdn.net";

const nextConfig: NextConfig = {
  devIndicators: false,
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
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data: https://cdn.jsdelivr.net; img-src 'self' data: https:; ${connectSrc}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
