export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/manage", "/api/"],
    },
    sitemap:
      (process.env.SITE_URL ||
        "https://al-hussaini-medical-center.yasirchanna.chatgpt.site") +
      "/sitemap.xml",
  };
}
