export const DEFAULT_SITE_URL = "http://localhost:3000";

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

const normalizeSiteUrl = (url: string | undefined) => {
  if (!url) {
    return DEFAULT_SITE_URL;
  }

  const trimmedUrl = trimTrailingSlash(url.trim());

  try {
    return new URL(trimmedUrl).toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
};

export const getSiteUrl = () => normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const absoluteUrl = (path = "/") => {
  const normalizedPath = path.replace(/^\/+/, "");
  const baseUrl = `${getSiteUrl()}/`;

  return new URL(normalizedPath, baseUrl).toString().replace(/\/$/, "");
};

export const siteUrl = getSiteUrl();
