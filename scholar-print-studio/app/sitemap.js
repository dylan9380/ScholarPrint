const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scholarprint.ca";

export default function sitemap() {
  const lastModified = new Date();
  return [
    {
      url: new URL("/", siteUrl).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: new URL("/order/new", siteUrl).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
