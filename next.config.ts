import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    serverActions: {
      // Pasted screenshots in /admin/learnings upload through a Server Action;
      // the 1MB default rejects most PNGs.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
