import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP fallback — noticeably smaller case screenshots/portraits.
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/contact", destination: "/about#contact", permanent: true },
      { source: "/start-project", destination: "/about#contact", permanent: true },
      { source: "/proje-baslat", destination: "/about#contact", permanent: true },
      {
        source: "/start-marketing",
        destination: "/about?topic=marketing#contact",
        permanent: true,
      },
    ];
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
