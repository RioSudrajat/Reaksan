import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in"],
        disallow: ["/student/", "/plp/", "/admin/", "/api/", "/app/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/sign-in"],
        disallow: ["/student/", "/plp/", "/admin/", "/api/", "/app/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
