export default function sitemap() {
  const origin =
    process.env.SITE_URL ||
    "https://al-hussaini-medical-center.yasirchanna.chatgpt.site";
  return ["", "/book", "/virtual"].map((p) => ({
    url: origin + p,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: p ? 0.7 : 1,
  }));
}
