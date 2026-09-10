import type { NextConfig } from "next";

const basePath = process.env.VERCEL ? "" : "/ncs-ai-feedback";

const nextConfig: NextConfig = {
  basePath,
  allowedDevOrigins: ["192.168.1.112", "10.1.134.171"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "10.1.134.171",
        "127.0.0.1:3002",
        "localhost:3002",
        "pmcwesmart.vercel.app",
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
