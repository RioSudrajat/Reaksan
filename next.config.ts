import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  // Allow the 127.0.0.1 alias during development so two browser tabs can hold
  // two different accounts (cookies are host-scoped, not port-scoped).
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // The student workspace moved from /app to /student. Old links keep working.
  async redirects() {
    return [
      { source: "/app", destination: "/student", permanent: false },
      {
        source: "/app/:path*",
        destination: "/student/:path*",
        permanent: false,
      },
    ];
  },
  // Emits .next/standalone with a minimal server and only the traced runtime
  // files for Docker. On Vercel, serverless output is handled natively.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
