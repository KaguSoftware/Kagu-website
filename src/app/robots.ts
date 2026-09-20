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
      // A crawler obeys only the most specific group that names it and ignores
      // the "*" group entirely, so each of these has to repeat the /admin
      // disallow or it inherits nothing and crawls the admin panel.
      { userAgent: "GPTBot", allow: "/", disallow: "/admin" },
      { userAgent: "ClaudeBot", allow: "/", disallow: "/admin" },
      { userAgent: "PerplexityBot", allow: "/", disallow: "/admin" },
      { userAgent: "Google-Extended", allow: "/", disallow: "/admin" },
    ],
    sitemap: "https://kagusoftware.com/sitemap.xml",
  };
}
