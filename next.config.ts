import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const noIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
];

const privateRouteHeaders = [
  ...noIndexHeaders,
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/panel/:path*",
        headers: privateRouteHeaders,
      },
      {
        source: "/acceso",
        headers: privateRouteHeaders,
      },
      {
        source: "/auth/:path*",
        headers: privateRouteHeaders,
      },
      {
        source: "/api/:path*",
        headers: privateRouteHeaders,
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
