import type { MetadataRoute } from "next";
import { getCases } from "@/lib/content";
import { SITE_URL, CONTENT_UPDATED } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cases = await getCases();
  const lastModified = new Date();
  // The static marketing/SEO pages carry the date their copy was last reviewed.
  const contentDate = new Date(`${CONTENT_UPDATED}T00:00:00Z`);
  return [
    { url: `${SITE_URL}/`, lastModified: contentDate, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/work`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/marketing`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "yearly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "yearly", priority: 0.8 },
    { url: `${SITE_URL}/start-project`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.9 },
    // SEO cluster pages — TR pages own their cluster, EN pages are the hreflang pair.
    { url: `${SITE_URL}/butik-operator-yazilimi`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/proje-baslat`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/custom-website-fiyati`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/custom-website-pricing`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/full-stack-platform-maliyeti`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/full-stack-platform-cost`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/multilingual-support-fiyat`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/multilingual-support-pricing`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/butik-operatoler-dijital-arac`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/digital-tools-for-boutique-operators`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/admin-sistemleri`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/admin-systems`, lastModified: contentDate, changeFrequency: "monthly", priority: 0.7 },
    // Legal pages
    { url: `${SITE_URL}/mesafeli-satis`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/teslimat-iade`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/gizlilik`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    ...cases.map((c) => ({
      url: `${SITE_URL}/work/${c.slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.85,
    })),
  ];
}
