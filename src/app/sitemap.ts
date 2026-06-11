import type { MetadataRoute } from "next";
import { getCases } from "@/lib/content";

const SITE = "https://kagu.software";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cases = await getCases();
  const lastModified = new Date();
  return [
    { url: `${SITE}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/work`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/about`, lastModified, changeFrequency: "yearly", priority: 0.7 },
    { url: `${SITE}/contact`, lastModified, changeFrequency: "yearly", priority: 0.8 },
    { url: `${SITE}/start-project`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    ...cases.map((c) => ({
      url: `${SITE}/work/${c.slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.85,
    })),
  ];
}
