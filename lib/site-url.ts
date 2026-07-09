export function getPublicSiteUrl(): URL | null {
  const rawUrl =
    process.env.AUTH_PUBLIC_ORIGIN?.trim() || process.env.APP_PUBLIC_URL?.trim();

  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

export function getPublicSiteOrigin(): string | null {
  return getPublicSiteUrl()?.origin ?? null;
}
