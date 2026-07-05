import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/phase/:slug/:topic.html",
        destination: "/phase/:slug/:topic",
        permanent: false,
      },
      {
        source: "/phase/:slug.html",
        destination: "/phase/:slug",
        permanent: false,
      },
      {
        source: "/projects/:id.html",
        destination: "/projects/:id",
        permanent: false,
      },
      {
        source: "/:page.html",
        destination: "/:page",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
