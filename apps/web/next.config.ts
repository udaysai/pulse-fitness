import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // We have a root package.json (for the monorepo scripts) AND an apps/web one.
    // Pin Turbopack's root to apps/web to silence the "multiple lockfiles" warning.
    root: path.resolve(__dirname),
  },
  // Allow loading exercise demo GIFs from GitHub raw
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
