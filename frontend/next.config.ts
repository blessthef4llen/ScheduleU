// Source file for Next.config.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  onDemandEntries: {
    maxInactiveAge: 15 * 60 * 1000,
    pagesBufferLength: 10,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
