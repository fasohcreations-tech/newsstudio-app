import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack rooted in this app when parent lockfiles exist
    root: path.join(__dirname),
  },
  // Composed WebM staging can be 10–50MB; Next 15.5 proxy defaults to ~1MB.
  experimental: {
    proxyClientMaxBodySize: "64mb",
    middlewareClientMaxBodySize: "64mb",
    serverActions: {
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;
