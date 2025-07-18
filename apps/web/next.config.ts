import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  turbopack: {
    // Ensure turbopack can access env vars
    resolveAlias: {
      'process.env': 'process.env',
    },
  },
  eslint: {
    // Skip ESLint during production builds for now
    ignoreDuringBuilds: true,
  },
};

export default withBundleAnalyzer(nextConfig);
