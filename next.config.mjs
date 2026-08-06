import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the dev-only on-screen route indicator (the badge in the page corner).
  devIndicators: false,
  // Pin the project root so Next ignores the stray lockfile in the parent folder.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // Product images are served from Shopify's CDN (both the canonical host and
  // the store domain that the New Arrivals feed references).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "lavenderhillclothing.com" },
    ],
  },
};

export default nextConfig;
