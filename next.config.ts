import type { NextConfig } from 'next';

// Phaser is loaded dynamically (browser-only) via bootstrap.ts inside useEffect.
// Turbopack still statically analyses the import chain and hits the Phaser ESM
// bundle which has no default export. We disable Turbopack for builds and keep
// it only for dev; for production we use webpack which handles CJS interop.

const nextConfig: NextConfig = {
  // Use webpack for production builds (turbopack is opt-in for dev only)
  // This is controlled via CLI: `next build` uses webpack, `next dev --turbopack` uses turbopack
};

export default nextConfig;
