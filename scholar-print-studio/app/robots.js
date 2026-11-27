const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scholarprint.ca";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
