import type { Enrichment, RawLead } from "./types.js";

/*
  Lead score, 0–100. Weights favour businesses that are demonstrably doing
  well (reviews) but have a weak/absent web presence — the studio's exact
  pitch. Keep in sync with docs/leads-module.md if you tune these.
*/
export function scoreLead(lead: RawLead, enrichment: Enrichment): number {
  let score = 0;
  const flags = new Set(enrichment.audit_flags);

  if (flags.has("no_website")) score += 40;
  if (flags.has("facebook_only") || flags.has("linktree_only")) score += 25;
  if (flags.has("no_ssl")) score += 15;
  if (flags.has("not_mobile_friendly")) score += 20;
  if (flags.has("slow_site")) score += 15;
  if (flags.has("active_ig_no_website")) score += 15;

  if ((lead.review_count ?? 0) > 50) score += 10;
  if (lead.rating !== null && lead.rating < 3.5) score -= 10;

  return Math.max(0, Math.min(100, score));
}
