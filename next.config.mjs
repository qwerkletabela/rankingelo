// next.config.mjs
import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },

  // jeśli chcesz tymczasowo wyłączyć ESLint w buildzie, ustaw true:
  eslint: { ignoreDuringBuilds: true },

  webpack: (config) => {
    // alias "@" → katalog projektu (działa z importami "@/components/...")
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(process.cwd()),
    };
    return config;
  },
};

export default nextConfig;
