import { describe, expect, it, vi } from "vitest";

const importSiteUrl = async () => {
  vi.resetModules();
  return import("./site-url");
};

describe("site-url", () => {
  it("uses the default site URL when NEXT_PUBLIC_SITE_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);

    const { DEFAULT_SITE_URL, getSiteUrl, siteUrl } = await importSiteUrl();

    expect(DEFAULT_SITE_URL).toBe("http://localhost:3000");
    expect(getSiteUrl()).toBe("http://localhost:3000");
    expect(siteUrl).toBe("http://localhost:3000");
  });

  it("normalizes a trailing slash from NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/");

    const { getSiteUrl } = await importSiteUrl();

    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("builds absolute URLs from relative paths", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com/base/");

    const { absoluteUrl } = await importSiteUrl();

    expect(absoluteUrl("/roadmap")).toBe("https://example.com/base/roadmap");
    expect(absoluteUrl("projects")).toBe("https://example.com/base/projects");
  });

  it("falls back to the default site URL for invalid URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a valid url");

    const { absoluteUrl, getSiteUrl } = await importSiteUrl();

    expect(getSiteUrl()).toBe("http://localhost:3000");
    expect(absoluteUrl("/roadmap")).toBe("http://localhost:3000/roadmap");
  });
});
