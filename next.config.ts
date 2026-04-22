import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  /**
   * Server Actions default body limit is 1 MB. Comic flows send large payloads
   * (many reference files + generated panel data). Raise when you still see
   * "Body exceeded … limit" after uploads or regeneration.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "256mb",
    },
  },
};

export default nextConfig;
