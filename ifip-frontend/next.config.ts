import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  ...(process.env.IFIP_ISOLATED_DEV === "1" ? { distDir: ".next/ifip-local" } : {}),
  ...(phase === PHASE_PRODUCTION_BUILD ? { typescript: { tsconfigPath: "tsconfig.build.json" } } : {}),
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
});

export default nextConfig;
