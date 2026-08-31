import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    // Serve modern AVIF & WebP formats for ~50% size reduction
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for 30 days in the browser
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Serve correct sizes at real device breakpoints
    deviceSizes: [640, 768, 1024, 1280, 1600],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
