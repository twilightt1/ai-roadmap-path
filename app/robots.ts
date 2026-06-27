import type { MetadataRoute } from "next";

const siteUrl = "https://ai-roadmap.local";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
