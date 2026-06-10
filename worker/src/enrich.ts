import { chromium, type Browser } from "playwright";
import { config } from "./config.js";
import { db } from "./db.js";
import type { AuditFlag, Enrichment, RawLead } from "./types.js";

/*
  enrichLead — audit one business's web presence and produce the signals the
  score is built from.

  Real implementation:
  - No website_url → ["no_website"]. (IG discovery via search scraping is
    deliberately skipped — it's block-prone; instagram_handle stays null
    unless the listing's "website" already points at instagram.com.)
  - facebook.com / fb.com → "facebook_only"; linktr.ee → "linktree_only".
  - Otherwise fetch the site once (redirects followed, 10s timeout):
    - final URL still http:// or TLS failure → "no_ssl"
    - time-to-response > 3s → "slow_site"
    - HTML lacks <meta name="viewport"> → "not_mobile_friendly"
  - Screenshot (1280×800) via a shared headless browser, uploaded to the
    public lead-screenshots bucket. Screenshot failures are non-fatal.
  - review_themes stays [] in real mode — the Maps "people mention" chips
    are sparse/locale-dependent; a later LLM pass can cluster snippets.

  MOCK_MODE derives flags deterministically from the mock listing so scores
  and filters are exercised end-to-end.
*/
export async function enrichLead(lead: RawLead): Promise<Enrichment> {
  if (config.mockMode) return mockEnrichment(lead);

  const flags: AuditFlag[] = [];
  let instagram_handle: string | null = null;
  let screenshot_url: string | null = null;
  const url = lead.website_url;

  if (!url) {
    flags.push("no_website");
  } else if (/(^|\.)((facebook|fb)\.com)/i.test(hostnameOf(url))) {
    flags.push("facebook_only");
  } else if (/(^|\.)linktr\.ee$/i.test(hostnameOf(url))) {
    flags.push("linktree_only");
  } else if (/(^|\.)instagram\.com$/i.test(hostnameOf(url))) {
    // Listing's "website" is actually an IG profile.
    flags.push("no_website", "active_ig_no_website");
    instagram_handle = url.split("instagram.com/")[1]?.split(/[/?#]/)[0] ?? null;
  } else {
    const audit = await auditWebsite(url);
    flags.push(...audit.flags);
    screenshot_url = await captureScreenshot(lead.place_id, audit.finalUrl ?? url);
  }

  return {
    audit_flags: flags,
    review_themes: [],
    instagram_handle,
    instagram_followers: null, // needs an IG data source; not worth scraping
    screenshot_url,
  };
}

/* One fetch, three signals: SSL, speed, mobile-friendliness. */
async function auditWebsite(
  url: string
): Promise<{ flags: AuditFlag[]; finalUrl: string | null }> {
  const flags: AuditFlag[] = [];
  const started = Date.now();
  let finalUrl: string | null = null;

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; KaguAudit/1.0)" },
    });
    const elapsed = Date.now() - started;
    finalUrl = res.url || url;

    if (finalUrl.startsWith("http://")) flags.push("no_ssl");
    if (elapsed > 3000) flags.push("slow_site");

    const html = (await res.text()).slice(0, 200_000); // head is enough
    if (!/<meta[^>]+name=["']?viewport["']?/i.test(html)) {
      flags.push("not_mobile_friendly");
    }
  } catch (err) {
    // TLS failure on an https URL reads as "no working SSL" to a visitor;
    // a dead site altogether is at least as bad as having none.
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    if (url.startsWith("http://") || /certificate|tls|ssl/i.test(message)) {
      flags.push("no_ssl");
    } else {
      flags.push("slow_site"); // timeout / unreachable
    }
    console.warn(`[enrich] audit fetch failed for ${url}: ${message}`);
  }

  return { flags, finalUrl };
}

/* Shared headless browser — launched on first screenshot, reused per job. */
let screenshotBrowser: Browser | null = null;

async function captureScreenshot(placeId: string, url: string): Promise<string | null> {
  try {
    screenshotBrowser ??= await chromium.launch({ headless: true });
    const page = await screenshotBrowser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1500); // let above-the-fold content settle
      const buffer = await page.screenshot({ fullPage: false, type: "png" });

      const path = `${safeName(placeId)}.png`;
      const { error } = await db.storage
        .from("lead-screenshots")
        .upload(path, buffer, { contentType: "image/png", upsert: true });
      if (error) throw new Error(error.message);

      return db.storage.from("lead-screenshots").getPublicUrl(path).data.publicUrl;
    } finally {
      await page.close();
    }
  } catch (err) {
    console.warn(`[enrich] screenshot failed for ${url}:`, err);
    return null;
  }
}

/* Call between jobs / at shutdown so the Chromium child doesn't linger. */
export async function closeEnrichBrowser(): Promise<void> {
  if (screenshotBrowser) {
    await screenshotBrowser.close().catch(() => {});
    screenshotBrowser = null;
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/* place_ids like "0x14ca…:0x…" contain ":" — not a valid storage key char. */
function safeName(placeId: string): string {
  return placeId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function mockEnrichment(lead: RawLead): Enrichment {
  const flags: AuditFlag[] = [];
  const url = lead.website_url;

  if (!url) {
    flags.push("no_website");
  } else if (url.includes("facebook.com")) {
    flags.push("facebook_only");
  } else if (url.includes("linktr.ee")) {
    flags.push("linktree_only");
  } else {
    if (url.startsWith("http://")) flags.push("no_ssl");
    // Pseudo-random but stable per place: spice up a few real-site mocks.
    const n = lead.place_id.charCodeAt(lead.place_id.length - 1);
    if (n % 2 === 0) flags.push("not_mobile_friendly");
    if (n % 3 === 0) flags.push("slow_site");
  }

  // Mock: businesses without a site sometimes run an active Instagram.
  const hasIg = !url && (lead.review_count ?? 0) > 50;
  if (hasIg) flags.push("active_ig_no_website");

  return {
    audit_flags: flags,
    review_themes: ["friendly staff", "clean place", "hard to book"],
    instagram_handle: hasIg ? lead.place_id.replace(/[^a-z0-9]/gi, "_") : null,
    instagram_followers: hasIg ? 1200 + (lead.review_count ?? 0) * 10 : null,
    screenshot_url: null, // real impl uploads to the lead-screenshots bucket
  };
}
