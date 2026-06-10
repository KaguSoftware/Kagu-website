import { config } from "./config.js";
import type { RawLead } from "./types.js";

/*
  crawlMaps — collect business listings from Google Maps for one
  "<category> <district> Istanbul" search.

  REAL IMPLEMENTATION (TODO):
  1. const browser = await chromium.launch({ headless: true })   // import { chromium } from "playwright"
     - Consider a persistent context with a real user profile dir to look
       less like a bot; rotate user agents sparingly (consistency > variety).
  2. Open https://www.google.com/maps/search/<encodeURIComponent(`${category} ${district} Istanbul`)>
     and dismiss the consent dialog if shown.
  3. Scroll the results feed (div[role="feed"]) with HUMAN PACING:
     - random 1.2–3.5s pauses between scrolls, occasional jitter/mouse moves,
     - stop when the "end of list" marker appears or after ~N items (cap, e.g. 60).
  4. For each result card, open the place panel and extract:
     - place_id: from the share URL or the card href (!1s… token / ?q=place_id:…)
     - name, category (subtitle), address, lat/lng (from the URL @lat,lng),
     - phone, website URL (button[data-item-id="authority"]),
     - rating + review count.
  5. Dedupe by place_id within the run (the feed repeats items while scrolling).
  6. Be polite: one search at a time, no parallel tabs, abort on CAPTCHA and
     fail the job rather than hammering retries.
  7. await browser.close() in a finally block.

  MOCK_MODE returns deterministic fake listings so the whole pipeline
  (panel → DB → worker → DB → panel) can be exercised without crawling.
*/
export async function crawlMaps(category: string, district: string): Promise<RawLead[]> {
  if (config.mockMode) return mockListings(category, district);

  throw new Error(
    "crawlMaps is not implemented yet — run with MOCK_MODE=1 or implement the Playwright crawl (see TODOs in worker/src/crawl.ts)."
  );
}

/* Deterministic per (category, district): re-runs upsert the same place_ids. */
function mockListings(category: string, district: string): RawLead[] {
  const seed = `${category}-${district}`.toLowerCase().replace(/\s+/g, "-");
  const variants: Array<Partial<RawLead>> = [
    { website_url: null, rating: 4.6, review_count: 132 },                     // no site, popular
    { website_url: null, rating: 4.1, review_count: 38 },                      // no site
    { website_url: `https://www.facebook.com/${seed}-3`, rating: 4.3, review_count: 67 },
    { website_url: `https://linktr.ee/${seed}4`, rating: 4.8, review_count: 210 },
    { website_url: `http://${seed}-5.example.com`, rating: 3.9, review_count: 45 },   // http → no_ssl
    { website_url: `https://${seed}-6.example.com`, rating: 3.2, review_count: 18 },  // weak rating
    { website_url: `https://${seed}-7.example.com`, rating: 4.7, review_count: 540 },
    { website_url: null, rating: 4.9, review_count: 89 },                      // no site, loved
  ];

  return variants.map((v, i) => ({
    place_id: `mock-${seed}-${i + 1}`,
    name: `${titleCase(category)} ${district} ${i + 1}`,
    category,
    district,
    address: `${titleCase(district)} Mah. Test Cad. No:${i + 1}, ${district}/İstanbul`,
    lat: 41.0 + i * 0.001,
    lng: 29.0 + i * 0.001,
    phone: `+90 212 555 0${i + 1}0${i + 1}`,
    website_url: v.website_url ?? null,
    rating: v.rating ?? null,
    review_count: v.review_count ?? null,
  }));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
