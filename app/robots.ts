import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/_next/", "/brand/"],
      disallow: ["/api/", "/usuarios", "/"],
    },
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
  };
}
