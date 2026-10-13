import { describe, expect, it, vi } from "vitest";

// Same env neutralising as the other suites: nothing here may reach a real
// service, and db.js is mocked so plan-tracking's pure helpers can load.
vi.hoisted(() => {
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.SERPER_API_KEY = "";
  process.env.MOCK_MODE = "0";
  process.env.GSC_KEY_FILE = "/nonexistent/gsc-key.json";
});
vi.mock("../src/db.js", () => ({ db: {} }));

import { composeFollowup, type PlanCheck } from "../src/followup.js";
import { aggregateByQuery, normalizeQuery } from "../src/gsc.js";
import { hasFaqPageSchema, indexability, titleHasHeadKeyword } from "../src/plan-tracking.js";
import type { StrategyReport } from "../src/strategy.js";

const NOW = new Date("2026-10-13T12:00:00Z");

function report(over: Partial<StrategyReport> = {}): StrategyReport {
  return {
    url: "https://example.com/",
    host: "example.com",
    fetchedAt: "2026-09-01T10:00:00Z",
    understanding: { marketCountry: "tr" } as StrategyReport["understanding"],
    searchesChecked: [],
    gsc: [],
    competitors: [],
    market: null,
    headKeywords: [],
    duplicatesRemoved: 0,
    audit: null,
    prompt: "",
    pages: [
      {
        action: "create",
        slug: "/web-tasarim-fiyatlari",
        title: "Web Tasarım Fiyatları 2026",
        metaDescription: "Net fiyatlar.",
        pageType: "pricing",
        intent: "commercial",
        language: "tr",
        headKeyword: "web tasarım fiyatları",
        clusterQueries: ["web sitesi fiyatları", "kurumsal web sitesi fiyat"],
        tailQueries: [],
        entities: ["paket", "süre"],
        faq: [
          { question: "Web sitesi kaç para?", answerGuidance: "the price range" },
          { question: "Ne kadar sürer?", answerGuidance: "the timeline" },
        ],
        outline: ["Paketler", "Süreç"],
      },
      {
        action: "update",
        slug: "/hizmetler",
        title: "Yazılım Hizmetleri",
        metaDescription: "",
        pageType: "service",
        intent: "commercial",
        language: "tr",
        headKeyword: "yazılım hizmetleri",
        clusterQueries: ["özel yazılım"],
        tailQueries: [],
        entities: [],
        faq: [],
        outline: [],
      },
    ],
    ...over,
  };
}

function check(over: Partial<PlanCheck> & { slug: string }): PlanCheck {
  return {
    action: "update",
    checkedAt: "2026-10-13T11:00:00Z",
    shipped: true,
    finalUrl: `https://example.com${over.slug}`,
    httpStatus: 200,
    inSitemap: true,
    indexable: true,
    titleHasHead: true,
    hasFaqSchema: null,
    impressions7d: null,
    clicks7d: null,
    avgPosition: null,
    baselineImpressions7d: null,
    auditIssues: null,
    ...over,
  };
}

const opts = { jobId: "job-1", finishedAt: "2026-09-01T10:00:00Z", now: NOW, graceDays: 7 };

describe("composeFollowup", () => {
  it("returns null when everything passes", () => {
    const r = report();
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", hasFaqSchema: true }),
      check({ slug: "/hizmetler" }),
    ];
    expect(composeFollowup(r, checks, [], opts)).toBeNull();
  });

  it("returns null when only wins are present", () => {
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", hasFaqSchema: true, impressions7d: 90, baselineImpressions7d: 40 }),
      check({ slug: "/hizmetler" }),
    ];
    expect(composeFollowup(report(), checks, [], opts)).toBeNull();
  });

  it("lists an unshipped create page with its full brief once past the grace period", () => {
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", shipped: false, httpStatus: 404, finalUrl: null, indexable: null, titleHasHead: null }),
      check({ slug: "/hizmetler" }),
    ];
    const f = composeFollowup(report(), checks, [], opts)!;
    expect(f).not.toBeNull();
    expect(f.summary.sections.map((s) => s.id)).toEqual(["not_shipped"]);
    expect(f.summary.shipped).toBe(1);
    expect(f.prompt).toContain("## 1. Not shipped yet");
    expect(f.prompt).toContain("Web sitesi kaç para?");
    expect(f.prompt).toContain("1. Paketler");
    expect(f.prompt).toContain("HTTP 404");
    expect(f.prompt).toContain("`web sitesi fiyatları`");
    expect(f.prompt).toContain("**Scoreboard:** 1/2 pages shipped · 1 indexable");
    expect(f.prompt).toContain("Strategy job `job-1`");
    expect(f.prompt).toContain("npm run seo:audit -- --single https://example.com/web-tasarim-fiyatlari");
    expect(f.prompt).toContain("npm run seo:speed -- https://example.com/hizmetler");
  });

  it("does not nag about unshipped create pages inside the grace period", () => {
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", shipped: false, httpStatus: 404 }),
      check({ slug: "/hizmetler" }),
    ];
    const f = composeFollowup(report(), checks, [], { ...opts, finishedAt: "2026-10-10T10:00:00Z" });
    expect(f).toBeNull();
  });

  it("flags a broken update page regardless of grace", () => {
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", hasFaqSchema: true }),
      check({ slug: "/hizmetler", shipped: false, httpStatus: 500 }),
    ];
    const f = composeFollowup(report(), checks, [], { ...opts, finishedAt: "2026-10-12T10:00:00Z" })!;
    expect(f.summary.sections).toEqual([{ id: "not_shipped", title: "Not shipped yet", slugs: ["/hizmetler"] }]);
    expect(f.prompt).toContain("existing page no longer serves (HTTP 500)");
  });

  it("gives the exact fix for each shipped-page failure", () => {
    const checks = [
      check({
        slug: "/web-tasarim-fiyatlari",
        action: "create",
        indexable: false,
        indexableReason: 'meta robots says "noindex"',
        inSitemap: false,
        titleHasHead: false,
        pageTitle: "Anasayfa",
        hasFaqSchema: false,
      }),
      check({ slug: "/hizmetler" }),
    ];
    const f = composeFollowup(report(), checks, [], opts)!;
    expect(f.summary.sections.map((s) => s.id)).toEqual(["fix_shipped"]);
    expect(f.summary.indexable).toBe(1);
    expect(f.prompt).toContain("**Not indexable** — meta robots says \"noindex\"");
    expect(f.prompt).toContain("<url><loc>https://example.com/web-tasarim-fiyatlari</loc></url>");
    expect(f.prompt).toContain('set `<title>` to "Web Tasarım Fiyatları 2026"');
    expect(f.prompt).toContain('live title: "Anasayfa"');
    expect(f.prompt).toContain('"@type": "FAQPage"');
  });

  it("reports only audit issues the strategy's audit didn't already have for that path", () => {
    const r = report({
      audit: {
        url: "https://example.com/",
        siteHost: "example.com",
        fetchedAt: "2026-09-01T10:00:00Z",
        maxPages: 6,
        pages: [{ url: "", finalUrl: "", httpStatus: 200, renderOk: true, score: 80, categories: [], metrics: {} as never }, { url: "", finalUrl: "", httpStatus: 200, renderOk: true, score: 80, categories: [], metrics: {} as never }],
        score: 80,
        categories: [],
        findings: [
          { category: "meta", label: "Meta description length", severity: "warn", issue: "", why: "", fix: "", specifics: [], pages: ["/hizmetler"] },
        ],
        passed: [],
      },
    });
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", hasFaqSchema: true }),
      check({
        slug: "/hizmetler",
        auditIssues: [
          { severity: "warn", label: "Meta description length", issue: "too short", fix: "lengthen" },
          { severity: "error", label: "Single H1", issue: "no h1", fix: "add one" },
          { severity: "info", label: "llms.txt", issue: "missing", fix: "add" },
        ],
      }),
    ];
    const f = composeFollowup(r, checks, [], opts)!;
    expect(f.summary.sections).toEqual([{ id: "audit_issues", title: "New audit issues on shipped pages", slugs: ["/hizmetler"] }]);
    expect(f.prompt).toContain("**Single H1**");
    expect(f.prompt).not.toContain("**Meta description length**");
    expect(f.prompt).not.toContain("llms.txt");
  });

  it("detects regressions by impressions and by position, and lists wins last", () => {
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", hasFaqSchema: true, impressions7d: 10, baselineImpressions7d: 40, avgPosition: 15 }),
      check({ slug: "/hizmetler", impressions7d: 30, baselineImpressions7d: 10, avgPosition: 8 }),
    ];
    const previous = [
      check({ slug: "/web-tasarim-fiyatlari", checkedAt: "2026-10-06T11:00:00Z", avgPosition: 9 }),
      check({ slug: "/hizmetler", checkedAt: "2026-10-06T11:00:00Z", avgPosition: 12 }),
    ];
    const f = composeFollowup(report(), checks, previous, opts)!;
    expect(f.summary.sections.map((s) => s.id)).toEqual(["regressed", "wins"]);
    expect(f.prompt).toContain("cluster impressions (7 days) 10 vs baseline 40 (-75%)");
    expect(f.prompt).toContain("average position 9 → 15 since 2026-10-06");
    expect(f.prompt).toContain("average position into the top 10: 12 → 8");
    expect(f.summary.impressions7d).toBe(40);
    expect(f.summary.baselineImpressions7d).toBe(50);
    expect(f.prompt.indexOf("Moved backwards")).toBeLessThan(f.prompt.indexOf("Wins"));
  });

  it("ignores impression drops on tiny baselines", () => {
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", hasFaqSchema: true, impressions7d: 0, baselineImpressions7d: 15 }),
      check({ slug: "/hizmetler" }),
    ];
    expect(composeFollowup(report(), checks, [], opts)).toBeNull();
  });

  it("fingerprints by (section, slug) only — stable across numbers and order", () => {
    const a = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", inSitemap: false, hasFaqSchema: true }),
      check({ slug: "/hizmetler", titleHasHead: false }),
    ];
    const b = [
      check({ slug: "/hizmetler", titleHasHead: false, impressions7d: 3 }),
      check({ slug: "/web-tasarim-fiyatlari", action: "create", inSitemap: false, hasFaqSchema: true, checkedAt: "2026-10-20T11:00:00Z" }),
    ];
    const fa = composeFollowup(report(), a, [], opts)!;
    const fb = composeFollowup(report(), b, [], opts)!;
    expect(fa.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(fa.fingerprint).toBe(fb.fingerprint);

    const c = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", inSitemap: false, hasFaqSchema: true }),
      check({ slug: "/hizmetler" }),
    ];
    expect(composeFollowup(report(), c, [], opts)!.fingerprint).not.toBe(fa.fingerprint);
  });

  it("falls back to tailQueries for reports without clusterQueries", () => {
    const r = report();
    const page = { ...r.pages[0], tailQueries: ["eski sorgu"] } as Record<string, unknown>;
    delete page.clusterQueries;
    r.pages = [page as unknown as StrategyReport["pages"][number], r.pages[1]];
    const checks = [
      check({ slug: "/web-tasarim-fiyatlari", action: "create", shipped: false, httpStatus: 404 }),
      check({ slug: "/hizmetler" }),
    ];
    expect(composeFollowup(r, checks, [], opts)!.prompt).toContain("`eski sorgu`");
  });
});

describe("plan-tracking helpers", () => {
  it("indexability: noindex meta, X-Robots-Tag, foreign canonical, self canonical", () => {
    const url = "https://example.com/a";
    expect(indexability('<meta name="robots" content="noindex,follow">', null, url).indexable).toBe(false);
    expect(indexability("<html></html>", "noindex", url).indexable).toBe(false);
    expect(indexability('<link rel="canonical" href="https://example.com/b">', null, url).indexable).toBe(false);
    expect(indexability('<link rel="canonical" href="https://www.example.com/a/">', null, url).indexable).toBe(true);
    expect(indexability('<link rel="canonical" href="/a">', null, url).indexable).toBe(true);
    expect(indexability("<html></html>", null, url)).toEqual({ indexable: true, reason: null });
  });

  it("titleHasHeadKeyword: fuzzy token overlap ≥ 0.6, Turkish suffixes tolerated", () => {
    expect(titleHasHeadKeyword("Web Tasarım Fiyatları 2026 | Kagu", "web tasarım fiyatları")).toBe(true);
    expect(titleHasHeadKeyword("İstanbul'da Web Tasarım", "istanbul web tasarım")).toBe(true);
    expect(titleHasHeadKeyword("Anasayfa | Kagu", "web tasarım fiyatları")).toBe(false);
  });

  it("hasFaqPageSchema: finds FAQPage in plain, @graph and array JSON-LD", () => {
    const wrap = (j: string) => `<script type="application/ld+json">${j}</script>`;
    expect(hasFaqPageSchema(wrap('{"@type":"FAQPage","mainEntity":[]}'))).toBe(true);
    expect(hasFaqPageSchema(wrap('{"@graph":[{"@type":"WebPage"},{"@type":"FAQPage"}]}'))).toBe(true);
    expect(hasFaqPageSchema(wrap('[{"@type":["FAQPage"]}]'))).toBe(true);
    expect(hasFaqPageSchema(wrap('{"@type":"Organization"}'))).toBe(false);
  });
});

describe("gsc helpers", () => {
  it("normalizeQuery: case, whitespace, Turkish combining dot", () => {
    expect(normalizeQuery("  İstanbul   Web  ")).toBe("istanbul web");
  });

  it("aggregateByQuery: sums volume, impression-weights position, keeps top page", () => {
    const rows = aggregateByQuery([
      { keys: ["web", "/a"], clicks: 1, impressions: 10, position: 4 },
      { keys: ["web", "/b"], clicks: 2, impressions: 30, position: 8 },
      { keys: ["other", "/c"], clicks: 0, impressions: 5, position: 20 },
    ]);
    expect(rows[0]).toEqual({ query: "web", topPage: "/b", clicks: 3, impressions: 40, position: 7 });
    expect(rows[1].query).toBe("other");
  });
});
