import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP fallback — noticeably smaller case screenshots/portraits.
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      // Pasted screenshots in /admin/learnings upload through a Server Action;
      // the 1MB default rejects most PNGs.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
