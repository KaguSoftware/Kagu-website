import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.SERPER_API_KEY = "";
  process.env.MOCK_MODE = "0";
  process.env.SEO_SERP_CACHE_HOURS = ""; // -> default 24h
});

import type { SerpPage } from "../src/seo.js";
import {
  SERP_MEMORY_CAP,
  memoryClear,
  memoryGet,
  memorySet,
  memorySize,
  normalizeQuery,
  serpCacheGet,
  serpCacheKey,
  serpCacheSet,
  topNBucket,
} from "../src/serp-cache.js";

const HOUR = 60 * 60 * 1000;

function serpPage(over: Partial<SerpPage> = {}): SerpPage {
  return {
    results: [{ rank: 1, title: "T", url: "https://example.com/", domain: "example.com" }],
    adsSkipped: 0,
    source: "serper",
    peopleAlsoAsk: [],
    relatedSearches: [],
    answerBox: null,
    knowledgeGraph: null,
    creditsUsed: 500,
    ...over,
  };
}

beforeEach(() => {
  memoryClear();
});

describe("normalizeQuery", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeQuery("  Dentist   ISTANBUL ")).toBe("dentist istanbul");
    expect(normalizeQuery("a\t\nb")).toBe("a b");
  });
});

describe("topNBucket", () => {
  it.each([
    [1, 10],
    [5, 10],
    [10, 10],
    [11, 20],
    [20, 20],
    [25, 30],
    [100, 100],
  ])("%i -> %i", (n, b) => {
    expect(topNBucket(n)).toBe(b);
  });
});

describe("serpCacheKey", () => {
  const base = serpCacheKey("dentist istanbul", "tr", "tr", 10);

  it("ignores case and whitespace differences in the query", () => {
    expect(serpCacheKey("  Dentist   ISTANBUL ", "tr", "tr", 10)).toBe(base);
  });

  it("ignores case and padding in region / language", () => {
    expect(serpCacheKey("dentist istanbul", " TR ", " Tr", 10)).toBe(base);
  });

  it("shares a key for topN within the same bucket, splits across buckets", () => {
    expect(serpCacheKey("dentist istanbul", "tr", "tr", 5)).toBe(base);
    expect(serpCacheKey("dentist istanbul", "tr", "tr", 20)).not.toBe(base);
    expect(serpCacheKey("dentist istanbul", "tr", "tr", 11)).toBe(
      serpCacheKey("dentist istanbul", "tr", "tr", 20)
    );
  });

  it("differs by region and by language", () => {
    expect(serpCacheKey("dentist istanbul", "us", "tr", 10)).not.toBe(base);
    expect(serpCacheKey("dentist istanbul", "tr", "en", 10)).not.toBe(base);
  });

  it("differs by query", () => {
    expect(serpCacheKey("dentist ankara", "tr", "tr", 10)).not.toBe(base);
  });
});

describe("memory layer", () => {
  it("misses on an empty cache", () => {
    expect(memoryGet("nope")).toBeNull();
    expect(memorySize()).toBe(0);
  });

  it("hits after set and returns the same page", () => {
    const p = serpPage();
    memorySet("k", p);
    expect(memoryGet("k")).toBe(p);
    expect(memorySize()).toBe(1);
  });

  it("expires after the TTL (24h default) and evicts the stale entry", () => {
    const t0 = 1_000_000;
    memorySet("k", serpPage(), t0);
    expect(memoryGet("k", t0 + 24 * HOUR)).not.toBeNull(); // exactly TTL: still fresh
    expect(memoryGet("k", t0 + 24 * HOUR + 1)).toBeNull();
    expect(memorySize()).toBe(0);
    expect(memoryGet("k", t0)).toBeNull(); // gone for good
  });

  it("evicts oldest entries past the cap", () => {
    const extra = 5;
    for (let i = 0; i < SERP_MEMORY_CAP + extra; i++) memorySet(`k${i}`, serpPage());
    expect(memorySize()).toBe(SERP_MEMORY_CAP);
    for (let i = 0; i < extra; i++) expect(memoryGet(`k${i}`), `k${i}`).toBeNull();
    expect(memoryGet(`k${extra}`)).not.toBeNull();
    expect(memoryGet(`k${SERP_MEMORY_CAP + extra - 1}`)).not.toBeNull();
  });

  it("re-setting a key makes it the newest, so it survives eviction", () => {
    for (let i = 0; i < SERP_MEMORY_CAP; i++) memorySet(`k${i}`, serpPage());
    const fresh = serpPage({ creditsUsed: 7 });
    memorySet("k0", fresh); // oldest -> newest
    expect(memorySize()).toBe(SERP_MEMORY_CAP);
    memorySet("overflow", serpPage());
    expect(memorySize()).toBe(SERP_MEMORY_CAP);
    expect(memoryGet("k0")).toBe(fresh);
    expect(memoryGet("k1")).toBeNull(); // evicted instead of k0
  });

  it("memoryClear empties the cache", () => {
    memorySet("a", serpPage());
    memoryClear();
    expect(memorySize()).toBe(0);
  });
});

describe("serpCacheGet / serpCacheSet (no Supabase creds)", () => {
  const key = serpCacheKey("dentist istanbul", "tr", "tr", 10);
  const any = () => true;

  it("returns null on a miss without throwing", async () => {
    await expect(serpCacheGet(key, any)).resolves.toBeNull();
  });

  it("returns a memory-layer hit after serpCacheSet", async () => {
    const p = serpPage();
    await serpCacheSet(key, "dentist istanbul", "tr", "tr", p);
    const hit = await serpCacheGet(key, any);
    expect(hit).not.toBeNull();
    expect(hit!.layer).toBe("memory");
    expect(hit!.page.results).toEqual(p.results);
  });

  it("stores with creditsUsed null and leaves the caller's page untouched", async () => {
    const p = serpPage({ creditsUsed: 321 });
    await serpCacheSet(key, "q", "tr", "tr", p);
    expect(memoryGet(key)!.creditsUsed).toBeNull();
    expect(p.creditsUsed).toBe(321);
  });

  it("ignores pages with zero results", async () => {
    await serpCacheSet(key, "q", "tr", "tr", serpPage({ results: [] }));
    expect(memorySize()).toBe(0);
    await expect(serpCacheGet(key, any)).resolves.toBeNull();
  });

  it("treats a vetoed hit exactly like a miss", async () => {
    await serpCacheSet(key, "q", "tr", "tr", serpPage({ source: "duckduckgo" }));
    const veto = vi.fn((p: SerpPage) => p.source === "serper");
    await expect(serpCacheGet(key, veto)).resolves.toBeNull();
    expect(veto).toHaveBeenCalled();
    // ...but the same entry is still served to a caller that accepts it.
    const hit = await serpCacheGet(key, (p) => p.source === "duckduckgo");
    expect(hit?.layer).toBe("memory");
  });

  it("serves a serper entry when the veto only rejects non-serper sources", async () => {
    await serpCacheSet(key, "q", "tr", "tr", serpPage({ source: "serper" }));
    const hit = await serpCacheGet(key, (p) => p.source === "serper");
    expect(hit?.layer).toBe("memory");
  });

  it("does not serve an expired memory entry", async () => {
    memorySet(key, serpPage(), Date.now() - 25 * HOUR);
    await expect(serpCacheGet(key, any)).resolves.toBeNull();
  });
});
