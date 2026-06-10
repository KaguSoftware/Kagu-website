import { config } from "./config.js";
import type { AuditFlag, Enrichment, RawLead } from "./types.js";

/*
  enrichLead — audit one business's web presence and produce the signals the
  score is built from.

  REAL IMPLEMENTATION (TODO):
  - No website_url → flags = ["no_website"]; optionally search
    "site:instagram.com <name> <district>" to find an IG handle, and flag
    active_ig_no_website when the account looks active (recent posts,
    follower count above a threshold).
  - facebook.com / fb.com URL → "facebook_only"; linktr.ee → "linktree_only".
  - Otherwise fetch the site once (follow redirects, ~10s timeout):
    - final URL still http:// (or TLS error) → "no_ssl"
    - response time > 3s or Lighthouse-ish heuristics → "slow_site"
    - HTML lacks <meta name="viewport"> → "not_mobile_friendly"
  - Screenshot with Playwright (1280×800, fullPage: false), then upload:
      await db.storage.from("lead-screenshots")
        .upload(`${place_id}.png`, buffer, { contentType: "image/png", upsert: true });
      const { data } = db.storage.from("lead-screenshots").getPublicUrl(`${place_id}.png`);
      screenshot_url = data.publicUrl;
  - review_themes: pull the top "people mention" chips from the Maps place
    panel (or leave [] and let a later LLM pass cluster review snippets).

  MOCK_MODE derives flags deterministically from the mock listing so scores
  and filters are exercised end-to-end.
*/
export async function enrichLead(lead: RawLead): Promise<Enrichment> {
  if (config.mockMode) return mockEnrichment(lead);

  throw new Error(
    "enrichLead is not implemented yet — run with MOCK_MODE=1 or implement the audit (see TODOs in worker/src/enrich.ts)."
  );
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
