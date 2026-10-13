import { describe, expect, it, vi } from "vitest";

// ESM imports are hoisted above plain statements, so env must be neutralised
// inside vi.hoisted. "" counts as "already set", so worker/.env cannot override.
vi.hoisted(() => {
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  process.env.SERPER_API_KEY = "";
  process.env.MOCK_MODE = "0";
  process.env.SEO_SERP_CACHE_HOURS = "";
});

import { parseSerperResponse, type SerperResponse } from "../src/seo.js";

function fixture(): SerperResponse {
  return {
    organic: [
      { title: "First", link: "https://www.example.com/a" },
      { title: "Duplicate of first", link: "https://www.example.com/a" },
      { link: "https://no-title.example.org/" }, // missing title
      { title: "Invalid", link: "not a url" },
      { title: "Second", link: "https://blog.second.io/post?x=1" },
      { title: "Third", link: "https://third.net/" },
      { title: "No link" },
    ],
    peopleAlsoAsk: [
      {
        question: "  How much is an implant?  ",
        snippet: " About 500 EUR ",
        title: " Implant prices ",
        link: " https://paa.example.com/ ",
      },
      { question: "", snippet: "orphan" },
      { question: "   ", snippet: "whitespace only" },
      { snippet: "no question at all" },
    ],
    relatedSearches: [{ query: " dentist istanbul " }, { query: "" }, {}, { query: "implant cost" }],
    answerBox: { title: " Answer ", answer: " 42 ", link: " https://answer.example.com " },
    knowledgeGraph: { title: " Istanbul ", type: " City " },
    credits: 1234,
  };
}

describe("parseSerperResponse", () => {
  it("builds contiguous ranks, strips www, and skips dupes / invalid / incomplete items", () => {
    const page = parseSerperResponse(fixture(), 10);
    expect(page.results.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(page.results).toEqual([
      { rank: 1, title: "First", url: "https://www.example.com/a", domain: "example.com" },
      { rank: 2, title: "Second", url: "https://blog.second.io/post?x=1", domain: "blog.second.io" },
      { rank: 3, title: "Third", url: "https://third.net/", domain: "third.net" },
    ]);
  });

  it("reports source serper, zero ads skipped and the call cost", () => {
    const page = parseSerperResponse(fixture(), 10);
    expect(page.source).toBe("serper");
    expect(page.adsSkipped).toBe(0);
    expect(page.creditsUsed).toBe(1234);
  });

  it("returns null creditsUsed when credits is absent or not a number", () => {
    const f = fixture();
    delete f.credits;
    expect(parseSerperResponse(f, 10).creditsUsed).toBeNull();
    f.credits = "99" as unknown as number;
    expect(parseSerperResponse(f, 10).creditsUsed).toBeNull();
  });

  it("truncates to topN while keeping ranks contiguous", () => {
    const page = parseSerperResponse(fixture(), 2);
    expect(page.results).toHaveLength(2);
    expect(page.results.map((r) => r.rank)).toEqual([1, 2]);
    expect(page.results[1].title).toBe("Second");
  });

  it("filters empty people-also-ask questions and trims fields", () => {
    const page = parseSerperResponse(fixture(), 10);
    expect(page.peopleAlsoAsk).toEqual([
      {
        question: "How much is an implant?",
        snippet: "About 500 EUR",
        title: "Implant prices",
        link: "https://paa.example.com/",
      },
    ]);
  });

  it("filters empty related searches and trims them", () => {
    expect(parseSerperResponse(fixture(), 10).relatedSearches).toEqual([
      "dentist istanbul",
      "implant cost",
    ]);
  });

  it("uses answerBox.answer when there is no snippet", () => {
    expect(parseSerperResponse(fixture(), 10).answerBox).toEqual({
      title: "Answer",
      snippet: "42",
      link: "https://answer.example.com",
    });
  });

  it("prefers answerBox.snippet over answer", () => {
    const f = fixture();
    f.answerBox = { snippet: "the snippet", answer: "the answer" };
    expect(parseSerperResponse(f, 10).answerBox?.snippet).toBe("the snippet");
  });

  it("returns null answerBox when neither snippet nor answer is present", () => {
    const f = fixture();
    f.answerBox = { title: "Only a title", link: "https://x.example/" };
    expect(parseSerperResponse(f, 10).answerBox).toBeNull();
    delete f.answerBox;
    expect(parseSerperResponse(f, 10).answerBox).toBeNull();
  });

  it("keeps the knowledge graph only when it has a title", () => {
    expect(parseSerperResponse(fixture(), 10).knowledgeGraph).toEqual({
      title: "Istanbul",
      type: "City",
    });
    const f = fixture();
    f.knowledgeGraph = { type: "City" };
    expect(parseSerperResponse(f, 10).knowledgeGraph).toBeNull();
    delete f.knowledgeGraph;
    expect(parseSerperResponse(f, 10).knowledgeGraph).toBeNull();
  });

  it("defaults the optional collections to empty when absent", () => {
    const page = parseSerperResponse({ organic: [{ title: "T", link: "https://t.example/" }] }, 5);
    expect(page.peopleAlsoAsk).toEqual([]);
    expect(page.relatedSearches).toEqual([]);
    expect(page.answerBox).toBeNull();
    expect(page.knowledgeGraph).toBeNull();
  });

  it("throws with Serper's own message when there are no organic results", () => {
    expect(() => parseSerperResponse({ message: "Not enough credits", organic: [] }, 10)).toThrow(
      /Not enough credits/
    );
    try {
      parseSerperResponse({ message: "Not enough credits", organic: [] }, 10);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toContain("Not enough credits");
    }
  });

  it("falls back to the error field for the message", () => {
    expect(() => parseSerperResponse({ error: "Unauthorized" }, 10)).toThrow(/Unauthorized/);
  });

  it("throws a plain '0 organic results' error for an empty payload", () => {
    expect(() => parseSerperResponse({}, 10)).toThrow(/0 organic results/);
    try {
      parseSerperResponse({}, 10);
    } catch (e) {
      expect((e as Error).message).not.toContain("Serper says");
    }
  });

  it("throws when every organic item is unusable", () => {
    expect(() =>
      parseSerperResponse({ organic: [{ title: "x", link: "not a url" }, { link: "https://a.b/" }] }, 10)
    ).toThrow(/0 organic results/);
  });
});
