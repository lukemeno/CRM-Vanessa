import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Operator app: do not infer a Vercel-only host. AUTH_URL is the canonical origin.
  agentRules: false,
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
