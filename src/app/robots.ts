import type { MetadataRoute } from "next";

/*
  robots.txt — everyone allowed, with the AI / answer-engine crawlers named
  explicitly so the site can be read and cited by AI Overviews and assistants.
  /admin is app UI, not content — keep crawlers out of it.
*/

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/admin",
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: "https://kagusoftware.com/sitemap.xml",
  };
}
