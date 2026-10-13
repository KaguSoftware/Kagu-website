import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.SERPER_API_KEY = "";
  process.env.MOCK_MODE = "0";
  process.env.SEO_SERP_CACHE_HOURS = "";
});

import {
  extractCandidates,
  fuzzyTokenMatch,
  tokenize,
  type KeywordCandidate,
  type PageText,
} from "../src/seo.js";

function page(over: Partial<PageText> = {}): PageText {
  return {
    url: "https://example.com/",
    title: "",
    metaDescription: "",
    metaKeywords: "",
    headings: "",
    body: "",
    ...over,
  };
}

function find(cands: KeywordCandidate[], keyword: string): KeywordCandidate | undefined {
  return cands.find((c) => c.keyword === keyword);
}

describe("tokenize", () => {
  it("lowercases Turkish dotted İ without leaving a bogus 'stanbul' token", () => {
    const t = tokenize("İstanbul DİŞ");
    expect(t).toContain("istanbul");
    expect(t).not.toContain("stanbul");
    // "DİŞ" lowercases to "di" + U+0307 + "ş"; the combining dot is dropped.
    expect(t).toEqual(["istanbul", "diş"]);
  });

  it("keeps Turkish letters and drops digits, single letters and over-long tokens", () => {
    expect(tokenize("çağrı ğüşıöç 2024 a u0131")).toEqual(["çağrı", "ğüşıöç"]);
    expect(tokenize("x".repeat(31))).toEqual([]);
    expect(tokenize("x".repeat(30))).toEqual(["x".repeat(30)]);
  });

  it("splits on punctuation", () => {
    expect(tokenize("dental-implant, cost.")).toEqual(["dental", "implant", "cost"]);
  });
});

describe("fuzzyTokenMatch", () => {
  it.each([
    ["kitap", "kitabı", true],
    ["istanbul", "istanbulda", true],
    ["dental", "dentist", false],
    ["internet", "international", false],
    ["car", "cars", false],
    ["same", "same", true],
    ["diş", "diş", true],
    ["diş", "dişi", false],
  ])("(%s, %s) -> %s", (a, b, expected) => {
    expect(fuzzyTokenMatch(a, b)).toBe(expected);
    expect(fuzzyTokenMatch(b, a)).toBe(expected);
  });
});

describe("extractCandidates: stopword edges", () => {
  const pages = [
    page({
      mainBody:
        "the dentist in istanbul. the dentist in istanbul. cost of implants. cost of implants.",
    }),
  ];
  const keywords = extractCandidates(pages).map((c) => c.keyword);

  it("never emits a phrase that starts or ends with a stopword", () => {
    for (const k of ["the dentist", "dentist in", "the dentist in", "in istanbul", "cost of"]) {
      expect(keywords, k).not.toContain(k);
    }
    for (const k of keywords) {
      const w = k.split(" ");
      expect(["the", "in", "of"]).not.toContain(w[0]);
      expect(["the", "in", "of"]).not.toContain(w[w.length - 1]);
    }
  });

  it("allows phrases with an inner stopword", () => {
    expect(keywords).toContain("cost of implants");
    expect(keywords).toContain("dentist in istanbul");
  });

  it("never emits a bare stopword", () => {
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("in");
  });
});

describe("extractCandidates: noise filter", () => {
  it("drops phrases seen once on a single page", () => {
    const out = extractCandidates([page({ mainBody: "alpha beta beta" })]);
    expect(find(out, "alpha")).toBeUndefined();
    expect(find(out, "beta")?.frequency).toBe(2);
  });

  it("keeps a once-per-page phrase if it spans two pages", () => {
    const out = extractCandidates([page({ mainBody: "gamma" }), page({ mainBody: "gamma" })]);
    expect(find(out, "gamma")?.pages).toBe(2);
  });
});

describe("extractCandidates: mainBody vs body", () => {
  it("counts mainBody and ignores words found only in body", () => {
    const out = extractCandidates([
      page({ mainBody: "alpha alpha", body: "alpha alpha chrome chrome chrome" }),
    ]);
    expect(find(out, "alpha")?.frequency).toBe(2);
    expect(find(out, "chrome")).toBeUndefined();
  });

  it("falls back to body when mainBody is empty or whitespace-only", () => {
    for (const mainBody of ["", "   \n "]) {
      const out = extractCandidates([page({ mainBody, body: "chrome chrome chrome" })]);
      expect(find(out, "chrome")?.frequency, JSON.stringify(mainBody)).toBe(3);
    }
  });

  it("falls back to body when mainBody is undefined", () => {
    const out = extractCandidates([page({ body: "chrome chrome" })]);
    expect(find(out, "chrome")?.frequency).toBe(2);
  });
});

describe("extractCandidates: score formula", () => {
  // (frequency + title*5 + heading*3 + meta*2 + coverage*10) * (1+0.3*(words-1)) * seed * boiler
  it("single page, single word, no signals: (3 + 10) = 13", () => {
    const out = extractCandidates([page({ mainBody: "implant implant implant" })]);
    const c = find(out, "implant")!;
    expect(c).toMatchObject({
      words: 1,
      frequency: 3,
      pages: 1,
      titleHits: 0,
      headingHits: 0,
      metaHits: 0,
      seedOverlap: false,
    });
    expect(c.score).toBe(13);
  });

  const rich: PageText[] = [
    page({
      title: "Dental Implants",
      headings: "Dental implants cost",
      metaDescription: "Dental implants",
      mainBody: "dental implants dental implants",
    }),
    page({ mainBody: "dental implants" }),
  ];

  it("multi-signal two-word phrase: (3 + 5 + 3 + 2 + 10) * 1.3 = 29.9 -> 30", () => {
    const c = find(extractCandidates(rich), "dental implants")!;
    expect(c).toMatchObject({
      words: 2,
      frequency: 3,
      pages: 2,
      titleHits: 1,
      headingHits: 1,
      metaHits: 1,
    });
    expect(c.score).toBe(30);
  });

  it("unigram from the same pages: 23, and x1.5 with a seed token -> 35", () => {
    expect(find(extractCandidates(rich), "dental")!.score).toBe(23);
    const seeded = find(extractCandidates(rich, "dental"), "dental")!;
    expect(seeded.seedOverlap).toBe(true);
    expect(seeded.score).toBe(35); // 34.5 rounds up
  });

  it("three-word phrase uses phraseBonus 1.6", () => {
    const out = extractCandidates([page({ mainBody: "cost of implants cost of implants" })]);
    const c = find(out, "cost of implants")!;
    expect(c.words).toBe(3);
    expect(c.frequency).toBe(2);
    expect(c.score).toBe(Math.round((2 + 10) * 1.6)); // 19
  });

  it("coverage scales with the share of pages using the phrase", () => {
    const pages = [
      page({ mainBody: "zeta zeta" }),
      page({ mainBody: "other text here" }),
      page({ mainBody: "more other text" }),
      page({ mainBody: "again other text" }),
    ];
    const c = find(extractCandidates(pages), "zeta")!;
    expect(c.pages).toBe(1);
    expect(c.score).toBe(Math.round(2 + (1 / 4) * 10)); // 4.5 -> 5 (float: 4.5 rounds up)
  });
});

describe("extractCandidates: seed relevance", () => {
  const pages = [page({ mainBody: "implant implant veneer veneer" })];

  it("gives phrases sharing a seed token x1.5 and flags seedOverlap", () => {
    const out = extractCandidates(pages, "implant");
    const a = find(out, "implant")!;
    const b = find(out, "veneer")!;
    expect(a.seedOverlap).toBe(true);
    expect(b.seedOverlap).toBe(false);
    expect(a.frequency).toBe(b.frequency);
    expect(b.score).toBe(12);
    expect(a.score).toBe(18);
    expect(Math.abs(a.score - b.score * 1.5)).toBeLessThanOrEqual(1);
  });

  it("applies the boost to multi-word phrases containing a seed token", () => {
    const out = extractCandidates([page({ mainBody: "implant veneer implant veneer" })], "implant");
    const withSeed = find(out, "implant veneer")!; // freq 2 (kept), bigram -> bonus 1.3
    expect(withSeed.seedOverlap).toBe(true);
    expect(withSeed.score).toBe(Math.round((2 + 10) * 1.3 * 1.5)); // 23.4 -> 23
  });

  it("no seed means no overlap and no boost", () => {
    const out = extractCandidates(pages);
    expect(out.every((c) => !c.seedOverlap)).toBe(true);
    expect(find(out, "implant")!.score).toBe(12);
  });

  it("ignores stopwords in the seed", () => {
    const out = extractCandidates([page({ mainBody: "dentist dentist the the" })], "the dentist");
    expect(find(out, "dentist")!.seedOverlap).toBe(true);
    // "the" is never a candidate anyway; nothing should match via the stopword.
    expect(find(out, "the")).toBeUndefined();
  });

  it("matches fuzzily: seed 'istanbul diş' hits 'istanbulda'", () => {
    const out = extractCandidates(
      [page({ mainBody: "istanbulda klinik istanbulda klinik" })],
      "istanbul diş"
    );
    expect(find(out, "istanbulda")!.seedOverlap).toBe(true);
    expect(find(out, "klinik")!.seedOverlap).toBe(false);
  });

  it("does not match 'dental' against 'dentist'", () => {
    const out = extractCandidates([page({ mainBody: "dentist dentist" })], "dental");
    expect(find(out, "dentist")!.seedOverlap).toBe(false);
    expect(find(out, "dentist")!.score).toBe(12);
  });

  it("handles a Turkish dotted-İ seed against lowercase page text", () => {
    const out = extractCandidates([page({ mainBody: "istanbul istanbul" })], "İSTANBUL");
    expect(find(out, "istanbul")!.seedOverlap).toBe(true);
  });
});

describe("extractCandidates: boilerplate penalty", () => {
  it("x0.3 for a phrase on every page with no title/heading/meta hit", () => {
    const pages = [page({ mainBody: "copyright copyright" }), page({ mainBody: "copyright copyright" })];
    const c = find(extractCandidates(pages), "copyright")!;
    expect(c).toMatchObject({ frequency: 4, pages: 2 });
    expect(c.score).toBe(Math.round((4 + 10) * 0.3)); // 4
  });

  it("is not applied when a title, heading or meta hit exists", () => {
    const body = "copyright copyright";
    for (const extra of [
      { title: "copyright" },
      { headings: "copyright" },
      { metaDescription: "copyright" },
      { metaKeywords: "copyright" },
    ]) {
      const pages = [page({ mainBody: body, ...extra }), page({ mainBody: body })];
      const c = find(extractCandidates(pages), "copyright")!;
      const hits = c.titleHits + c.headingHits + c.metaHits;
      expect(hits, JSON.stringify(extra)).toBe(1);
      const expected = Math.round(4 + c.titleHits * 5 + c.headingHits * 3 + c.metaHits * 2 + 10);
      expect(c.score, JSON.stringify(extra)).toBe(expected);
    }
  });

  it("is not applied when the phrase is missing from at least one page", () => {
    const pages = [
      page({ mainBody: "copyright copyright" }),
      page({ mainBody: "copyright copyright" }),
      page({ mainBody: "something else entirely" }),
    ];
    const c = find(extractCandidates(pages), "copyright")!;
    expect(c.pages).toBe(2);
    expect(c.score).toBe(Math.round(4 + (2 / 3) * 10)); // 11
  });

  it("is not applied with a single page", () => {
    const c = find(extractCandidates([page({ mainBody: "copyright copyright" })]), "copyright")!;
    expect(c.score).toBe(12);
  });

  it("makes a boilerplate phrase score well below an otherwise-identical headed one", () => {
    const pages = [
      page({ headings: "headed", mainBody: "headed headed plain plain" }),
      page({ mainBody: "headed headed plain plain" }),
    ];
    const out = extractCandidates(pages);
    const headed = find(out, "headed")!;
    const plain = find(out, "plain")!;
    // Both on all pages with the same frequency; only "headed" has a heading hit.
    expect(headed.frequency).toBe(plain.frequency);
    expect(headed.score).toBe(Math.round(4 + 3 + 10)); // 17
    expect(plain.score).toBe(Math.round((4 + 10) * 0.3)); // 4
  });
});

describe("extractCandidates: ordering and shape", () => {
  it("returns candidates sorted by score, highest first", () => {
    const out = extractCandidates(
      [
        page({
          title: "implant",
          headings: "implant",
          mainBody: "implant implant implant veneer veneer crown crown",
        }),
        page({ mainBody: "implant implant veneer" }),
      ],
      "implant"
    );
    expect(out.length).toBeGreaterThan(2);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
    expect(out[0].keyword).toBe("implant");
  });

  it("breaks score ties by page count then frequency", () => {
    const out = extractCandidates([page({ mainBody: "aaa aaa bbb bbb" }), page({ mainBody: "bbb" })]);
    for (let i = 1; i < out.length; i++) {
      const [p, c] = [out[i - 1], out[i]];
      if (p.score === c.score) {
        expect(p.pages > c.pages || (p.pages === c.pages && p.frequency >= c.frequency)).toBe(true);
      }
    }
  });

  it("returns an empty list for no pages or empty text", () => {
    expect(extractCandidates([])).toEqual([]);
    expect(extractCandidates([page()])).toEqual([]);
  });
});
