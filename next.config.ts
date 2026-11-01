import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Reklam görselleri dosya adı içerik kimliği olduğu için uzun süre önbelleğe alınabilir.
  async headers() {
    const cache = (value: string) => [{ key: "Cache-Control", value }];
    return [
      ...["/pulled/:path*", "/thumbs/:path*", "/medium/:path*"].map((source) => ({
        source,
        headers: cache("public, max-age=2592000, stale-while-revalidate=86400"),
      })),
      { source: "/ads/:path*", headers: cache("public, max-age=86400") },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
