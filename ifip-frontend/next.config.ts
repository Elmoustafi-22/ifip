import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: process.env.NODE_ENV === "production" ? "https://ifip.nextif.org" : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
