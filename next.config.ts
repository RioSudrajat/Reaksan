import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  // Allow the 127.0.0.1 alias during development so two browser tabs can hold
  // two different accounts (cookies are host-scoped, not port-scoped).
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  // The student workspace moved from /app to /student. Old links keep working.
  async redirects() {
    return [
      { source: "/app", destination: "/student", permanent: false },
      { source: "/app/:path*", destination: "/student/:path*", permanent: false },
    ];
  },
  // Emits .next/standalone with a minimal server and only the traced runtime
  // files. The Dockerfile ships that folder; npm start keeps working as before.
  output: "standalone",
};

export default nextConfig;
