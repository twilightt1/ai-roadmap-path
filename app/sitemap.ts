import type { MetadataRoute } from "next";
import { phases } from "@/lib/roadmap-data";

const siteUrl = "https://ai-roadmap.local";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { url: "/", priority: 1.0, changeFrequency: "monthly" as const },
    { url: "/roadmap", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/projects", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/skills", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/paths", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/resources", priority: 0.6, changeFrequency: "monthly" as const },
  ];

  const phaseRoutes = phases.map((p) => ({
    url: `/phase/${p.slug}`,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  }));

  return [...staticRoutes, ...phaseRoutes].map((r) => ({
    ...r,
    url: `${siteUrl}${r.url}`,
    lastModified: new Date(),
  }));
}
