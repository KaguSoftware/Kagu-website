import { chromium, type Browser, type Page } from "playwright";
import { config } from "./config.js";
import type { RawLead } from "./types.js";

/*
  crawlMaps — collect business listings from Google Maps for one
  "<category> <district> Istanbul" search.

  Real implementation: one headless Chromium per job, one search at a time,
  human pacing between scrolls/clicks, abort on CAPTCHA. `hl=en` keeps the
  DOM labels predictable regardless of the machine's locale. Google Maps
  markup is volatile — every selector below is best-effort with a null
  fallback so a single missing field never kills the lead.

  MOCK_MODE returns deterministic fake listings so the whole pipeline
  (panel → DB → worker → DB → panel) can be exercised without crawling.
*/
export async function crawlMaps(
  category: string,
  district: string,
  /* Called after each place is visited — lets the caller report real progress
     and abort (by throwing) on job cancellation. */
  onProgress?: (done: number, total: number) => Promise<void> | void
): Promise<RawLead[]> {
  if (config.mockMode) return mockListings(category, district);

  const browser: Browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      locale: "en-US",
      viewport: { width: 1366, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    const query = `${category} ${district} Istanbul`;
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`,
      { waitUntil: "domcontentloaded", timeout: 45000 }
    );

    await dismissConsent(page);
    await assertNoCaptcha(page);

    // The feed renders client-side well after domcontentloaded — wait for
    // either a results feed or a direct place page before deciding which
    // path we're on. Checking too early reads as "0 results".
    await page
      .waitForSelector('div[role="feed"], div[role="main"] h1', { timeout: 20000 })
      .catch(() => {});

    // The results feed. A direct hit (single place, no feed) is handled too.
    const feed = page.locator('div[role="feed"]');
    let cardHrefs: string[];
    if (await feed.count()) {
      await scrollFeedToEnd(page);
      cardHrefs = await feed
        .locator('a[href*="/maps/place/"]')
        .evaluateAll((as) => as.map((a) => (a as unknown as { href: string }).href));
    } else if (await page.locator("h1").count()) {
      cardHrefs = [page.url()]; // search resolved straight to one place
    } else {
      cardHrefs = [];
    }

    // Dedupe by hex place token (the feed repeats items while scrolling).
    const seen = new Set<string>();
    const targets: string[] = [];
    for (const href of cardHrefs) {
      const id = extractPlaceId(href) ?? href;
      if (seen.has(id)) continue;
      seen.add(id);
      targets.push(href);
      if (targets.length >= config.maxListings) break;
    }
    console.log(`[crawl] ${targets.length} unique listings for "${query}"`);

    // A populated-Istanbul-district search should never be empty — fail loudly
    // (panel offers Retry) instead of completing a job with silent 0 leads.
    if (targets.length === 0) {
      throw new Error(
        `0 listings extracted for "${query}" — page title was "${await page.title()}". ` +
          "Google may have served an unexpected layout or interstitial; retry the job."
      );
    }

    const leads: RawLead[] = [];
    for (let i = 0; i < targets.length; i++) {
      await assertNoCaptcha(page);
      try {
        const lead = await extractPlace(page, targets[i], category, district);
        if (lead) leads.push(lead);
      } catch (err) {
        console.warn(`[crawl] failed to extract ${targets[i]}:`, err);
      }
      await onProgress?.(i + 1, targets.length);
      await sleep(rand(1200, 3500)); // polite pacing between places
    }
    return leads;
  } finally {
    await browser.close();
  }
}

/* Open one place page and pull every field we can. */
async function extractPlace(
  page: Page,
  href: string,
  category: string,
  district: string
): Promise<RawLead | null> {
  await page.goto(href.includes("hl=") ? href : `${href}${href.includes("?") ? "&" : "?"}hl=en`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector("h1", { timeout: 15000 });
  await sleep(rand(600, 1400)); // let the panel hydrate

  const url = page.url();
  const place_id = extractPlaceId(url) ?? extractPlaceId(href);
  const name = (await textOf(page, "h1"))?.trim() ?? null;
  if (!place_id || !name) return null;

  // !3d/!4d carry the place's own coords; @lat,lng is just the map center.
  const coord = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  const ratingLabel = await attrOf(page, 'div[role="main"] span[role="img"][aria-label*="star"]', "aria-label");
  const rating = ratingLabel ? parseFloat(ratingLabel.replace(",", ".")) : null;

  const reviewLabel = await attrOf(page, 'div[role="main"] span[aria-label*="review"]', "aria-label");
  const review_count = reviewLabel ? parseInt(reviewLabel.replace(/[^\d]/g, ""), 10) : null;

  return {
    place_id,
    name,
    category: (await textOf(page, 'button[jsaction*="category"]')) ?? category,
    district,
    address: cleanField(await textOf(page, 'button[data-item-id="address"]')),
    lat: coord ? parseFloat(coord[1]) : null,
    lng: coord ? parseFloat(coord[2]) : null,
    phone: cleanField(await textOf(page, 'button[data-item-id^="phone"]')),
    website_url: (await attrOf(page, 'a[data-item-id="authority"]', "href")) ?? null,
    rating: rating != null && Number.isFinite(rating) ? rating : null,
    review_count: review_count != null && Number.isFinite(review_count) ? review_count : null,
  };
}

/* Scroll div[role="feed"] with human pacing until the end marker or the cap. */
async function scrollFeedToEnd(page: Page): Promise<void> {
  const feed = page.locator('div[role="feed"]');
  let lastCount = 0;
  let stalls = 0;

  for (let i = 0; i < 40; i++) {
    await feed.evaluate((el) => el.scrollBy(0, el.scrollHeight));
    await sleep(rand(1200, 3500));

    // Occasional jitter so the trace looks less mechanical.
    if (Math.random() < 0.3) {
      await page.mouse.move(rand(200, 900), rand(200, 700));
    }

    const count = await feed.locator('a[href*="/maps/place/"]').count();
    const atEnd = await page
      .getByText("You've reached the end of the list", { exact: false })
      .count();
    if (atEnd > 0 || count >= config.maxListings) return;

    stalls = count === lastCount ? stalls + 1 : 0;
    if (stalls >= 3) return; // nothing new after 3 scrolls — assume done
    lastCount = count;
  }
}

/* Consent interstitial (consent.google.com or in-page dialog). */
async function dismissConsent(page: Page): Promise<void> {
  try {
    const accept = page.getByRole("button", { name: /accept all|reject all/i }).first();
    if (await accept.count()) {
      await accept.click({ timeout: 5000 });
      await page.waitForLoadState("domcontentloaded");
      await sleep(rand(800, 1500));
    }
  } catch {
    /* no consent screen — fine */
  }
}

/* Abort the whole job on CAPTCHA — hammering retries only digs the hole deeper. */
async function assertNoCaptcha(page: Page): Promise<void> {
  if (page.url().includes("/sorry/") || (await page.locator("iframe[src*='recaptcha']").count()) > 0) {
    throw new Error("Google CAPTCHA encountered — aborting job. Wait before retrying.");
  }
}

/* The 0x…:0x… hex pair in place URLs is a stable per-place identifier. */
function extractPlaceId(url: string): string | null {
  const m = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i) ?? url.match(/19s(ChIJ[\w-]+)/);
  return m ? m[1] : null;
}

async function textOf(page: Page, selector: string): Promise<string | null> {
  try {
    const el = page.locator(selector).first();
    if ((await el.count()) === 0) return null;
    return await el.innerText({ timeout: 3000 });
  } catch {
    return null;
  }
}

async function attrOf(page: Page, selector: string, attr: string): Promise<string | null> {
  try {
    const el = page.locator(selector).first();
    if ((await el.count()) === 0) return null;
    return await el.getAttribute(attr, { timeout: 3000 });
  } catch {
    return null;
  }
}

/* Maps prefixes button text with an icon glyph + newline — keep the last line. */
function cleanField(s: string | null): string | null {
  if (!s) return null;
  const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines[lines.length - 1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

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
