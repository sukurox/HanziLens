import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Keep native/server-only libraries outside the browser bundle.
  serverExternalPackages: ["nodejieba", "pdf-parse"],
};

export default nextConfig;
