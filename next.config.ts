import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack rooted in this app when parent lockfiles exist
    root: path.join(__dirname),
  },
};

export default nextConfig;
