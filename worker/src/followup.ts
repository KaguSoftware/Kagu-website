import { createHash } from "node:crypto";
import type { StrategyReport } from "./strategy.js";

/*
  followup.ts — the deterministic follow-up prompt.

  The master prompt is a one-shot brief. The weekly plan check
  (plan-tracking.ts) measures what actually happened on the live site —
  shipped, indexable, in the sitemap, title carrying the head keyword, FAQ
  schema, Search Console movement — and this module turns the actionable
  part of that measurement into a short markdown brief for the same coding
  agent. No LLM: every line is computed from the plan and the checks, so it
  is reproducible, cheap and never invents a fix.

  Pure (no I/O): composeFollowup(report, checks, previousChecks, opts) →
  { summary, prompt, fingerprint } | null. null = nothing actionable (wins
  alone never produce a follow-up). The fingerprint is a sha256 over the
  sorted (section, slug) pairs, so the caller can skip writing a new
  follow-up when the findings haven't changed since the last one.
*/

export type Severity = "error" | "warn" | "info";

export interface PlanAuditIssue {
  severity: Severity;
  label: string;
  issue: string;
  fix: string;
}

/* One planned page as measured by one plan check — the camelCase mirror of a
   seo_plan_checks row, plus in-memory diagnostics the DB doesn't store. */
export interface PlanCheck {
  slug: string;
  action: "create" | "update";
  checkedAt: string;
  shipped: boolean;
  finalUrl: string | null;
  httpStatus: number | null; // null = unreachable
  inSitemap: boolean | null; // null = no sitemap found
  indexable: boolean | null; // null = not shipped
  titleHasHead: boolean | null;
  hasFaqSchema: boolean | null; // null = not required (plan had < 2 FAQs) or not shipped
  impressions7d: number | null; // null = Search Console not configured
  clicks7d: number | null;
  avgPosition: number | null;
  baselineImpressions7d: number | null; // null = no GSC baseline in the report
  auditIssues: PlanAuditIssue[] | null; // null = not audited
  /* Diagnostics (current pass only; not persisted). */
  indexableReason?: string | null; // why indexable === false
  pageTitle?: string | null; // the live <title>
}

export type FollowupSectionId = "not_shipped" | "fix_shipped" | "audit_issues" | "regressed" | "wins";

export interface FollowupSummary {
  host: string;
  checkedAt: string;
  pagesPlanned: number;
  shipped: number;
  indexable: number;
  impressions7d: number | null;
  baselineImpressions7d: number | null;
  sections: Array<{ id: FollowupSectionId; title: string; slugs: string[] }>;
}

export interface Followup {
  summary: FollowupSummary;
  prompt: string;
  fingerprint: string;
}

export interface FollowupOptions {
  jobId?: string;
  finishedAt?: string | null; // strategy job finish time — gates "not shipped yet"
  now?: Date;
  graceDays?: number; // default 7
}

/* Thresholds — documented in worker/README.md ("Plan tracking & follow-up prompts"). */
export const REGRESSION_IMPRESSIONS_RATIO = 0.7; // < 70% of baseline = moved backwards
export const REGRESSION_MIN_BASELINE = 20; // ignore noise on tiny baselines
export const REGRESSION_POSITION_DROP = 3; // avg position worse by > 3 vs previous check
export const WIN_IMPRESSIONS_RATIO = 1.5; // ≥ 150% of baseline = win
export const WIN_FIRST_IMPRESSIONS = 10; // zero baseline → this many 7-day impressions = win

const SECTION_TITLES: Record<FollowupSectionId, string> = {
  not_shipped: "Not shipped yet",
  fix_shipped: "Shipped, but needs fixing",
  audit_issues: "New audit issues on shipped pages",
  regressed: "Moved backwards",
  wins: "Wins (no action needed)",
};

type Page = StrategyReport["pages"][number];

function clusterOf(p: Page): string[] {
  const x = p as { clusterQueries?: string[]; tailQueries?: string[] };
  return (Array.isArray(x.clusterQueries) && x.clusterQueries.length ? x.clusterQueries : x.tailQueries) ?? [];
}

const slugPath = (slug: string) => (slug.startsWith("/") ? slug : `/${slug}`);

function pathOf(url: string | null, slug: string): string {
  if (url) {
    try {
      return new URL(url).pathname || "/";
    } catch {
      /* fall through */
    }
  }
  return slugPath(slug);
}

const normPath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p).toLowerCase();

const day = (iso: string) => iso.slice(0, 10);

function sumOrNull(values: Array<number | null>): number | null {
  const known = values.filter((v): v is number => typeof v === "number");
  return known.length ? known.reduce((s, v) => s + v, 0) : null;
}

function pct(now: number, base: number): string {
  const d = Math.round(((now - base) / base) * 100);
  return `${d >= 0 ? "+" : ""}${d}%`;
}

/* Issues the strategy's embedded audit already reported for this path —
   only NEW ones are worth a follow-up (the master prompt covered the rest). */
function baselineIssueLabels(report: StrategyReport, path: string): Set<string> {
  const out = new Set<string>();
  const audit = report.audit;
  if (!audit) return out;
  const p = normPath(path);
  const singlePage = audit.pages.length <= 1;
  for (const f of audit.findings) {
    const onPath = singlePage || f.pages.length === 0 || f.pages.some((fp) => normPath(fp) === p);
    if (onPath) out.add(f.label.toLowerCase());
  }
  return out;
}

export function composeFollowup(
  report: StrategyReport,
  checks: PlanCheck[],
  previousChecks: PlanCheck[],
  opts: FollowupOptions = {}
): Followup | null {
  const now = opts.now ?? new Date();
  const graceDays = opts.graceDays ?? 7;
  const pageBySlug = new Map(report.pages.map((p) => [p.slug, p]));
  const prevBySlug = new Map<string, PlanCheck>();
  for (const c of previousChecks) {
    const seen = prevBySlug.get(c.slug);
    if (!seen || c.checkedAt > seen.checkedAt) prevBySlug.set(c.slug, c);
  }
  const origin = (() => {
    try {
      return new URL(report.url).origin;
    } catch {
      return `https://${report.host}`;
    }
  })();
  const liveUrl = (c: PlanCheck) => c.finalUrl ?? `${origin}${slugPath(c.slug)}`;

  const finishedMs = opts.finishedAt ? new Date(opts.finishedAt).getTime() : new Date(report.fetchedAt).getTime();
  const pastGrace = Number.isFinite(finishedMs) && now.getTime() - finishedMs >= graceDays * 86_400_000;

  const blocks: Record<FollowupSectionId, Array<{ slug: string; md: string }>> = {
    not_shipped: [],
    fix_shipped: [],
    audit_issues: [],
    regressed: [],
    wins: [],
  };

  for (const c of checks) {
    const page = pageBySlug.get(c.slug);
    const path = slugPath(c.slug);

    /* ---- Not shipped -------------------------------------------------- */
    if (!c.shipped) {
      const measured = c.httpStatus === null ? "unreachable" : `HTTP ${c.httpStatus}`;
      if (c.action === "update") {
        // An existing page that stopped answering is urgent — no grace period.
        blocks.not_shipped.push({
          slug: c.slug,
          md:
            `### \`${path}\` — existing page no longer serves (${measured})\n` +
            `- This page existed when the strategy ran and was planned as an **update**. GET ${liveUrl(c)} now returns ${measured}.\n` +
            `- Fix: restore the route (or 301-redirect it to its replacement and update every internal link). Then apply the §4 update from the master prompt${page ? ` — head keyword \`${page.headKeyword}\`` : ""}.`,
        });
      } else if (pastGrace && page) {
        const faq = page.faq.length
          ? page.faq
              .map((f) => `  - Q: "${f.question}"\n    → the first sentence of the answer must state: ${f.answerGuidance || "the direct factual answer"}`)
              .join("\n")
          : "  - (none planned)";
        const outline = page.outline.length ? page.outline.map((o, n) => `  ${n + 1}. ${o}`).join("\n") : "  (no outline planned)";
        const cluster = clusterOf(page);
        blocks.not_shipped.push({
          slug: c.slug,
          md:
            `### \`${path}\` — ${page.title}\n` +
            `- Measured: GET ${origin}${path} → ${measured}. Build it now; everything needed is below.\n` +
            `- Head keyword: \`${page.headKeyword}\` (${page.intent}, ${page.pageType}, language \`${page.language}\`)\n` +
            `- <title>: "${page.title}"\n` +
            (page.metaDescription ? `- Meta description: "${page.metaDescription}"\n` : "") +
            (cluster.length ? `- Cluster (cover the meaning, don't paste the strings): ${cluster.map((q) => `\`${q}\``).join(", ")}\n` : "") +
            (page.entities?.length ? `- Must cover: ${page.entities.join("; ")}\n` : "") +
            `- Outline (H2s):\n${outline}\n` +
            `- FAQ — render as visible Q&A **and** a matching FAQPage JSON-LD block:\n${faq}\n` +
            `- Ship it with: a self-referencing canonical, no \`noindex\`, an entry in the sitemap, and at least one internal link from a related existing page.`,
        });
      }
      continue;
    }

    /* ---- Shipped but broken --------------------------------------------- */
    const fixes: string[] = [];
    const url = liveUrl(c);
    if (c.indexable === false) {
      fixes.push(
        `- **Not indexable**${c.indexableReason ? ` — ${c.indexableReason}` : ""}. Fix: remove \`noindex\` from \`<meta name="robots">\` and from any \`X-Robots-Tag\` response header, and make \`<link rel="canonical">\` point at the page itself (\`${url}\`).`
      );
    }
    if (c.inSitemap === false) {
      fixes.push(
        `- **Missing from the sitemap.** Fix: add \`<url><loc>${url}</loc></url>\` to the sitemap that robots.txt points at (generate it from the routes, so future pages land there automatically).`
      );
    }
    if (c.titleHasHead === false && page) {
      fixes.push(
        `- **Title misses the head keyword \`${page.headKeyword}\`**${c.pageTitle ? ` — live title: "${c.pageTitle}"` : ""}. Fix: set \`<title>\` to "${page.title}" (head keyword first, ≤ 60 characters).`
      );
    }
    if (c.hasFaqSchema === false && page) {
      fixes.push(
        `- **FAQPage JSON-LD missing** (the plan has ${page.faq.length} FAQ entries). Fix: add one \`<script type="application/ld+json">\` with \`"@type": "FAQPage"\` whose \`mainEntity\` lists exactly the visible questions and answers:\n` +
          page.faq.map((f) => `  - "${f.question}"`).join("\n")
      );
    }
    if (fixes.length) {
      blocks.fix_shipped.push({ slug: c.slug, md: `### \`${pathOf(c.finalUrl, c.slug)}\`\n${fixes.join("\n")}` });
    }

    /* ---- New audit issues --------------------------------------------- */
    if (c.auditIssues?.length) {
      const known = baselineIssueLabels(report, pathOf(c.finalUrl, c.slug));
      const fresh = c.auditIssues.filter((i) => i.severity !== "info" && !known.has(i.label.toLowerCase()));
      if (fresh.length) {
        blocks.audit_issues.push({
          slug: c.slug,
          md:
            `### \`${pathOf(c.finalUrl, c.slug)}\`\n` +
            fresh.map((i) => `- [${i.severity.toUpperCase()}] **${i.label}** — ${i.issue}\n  Fix: ${i.fix}`).join("\n"),
        });
      }
    }

    /* ---- Movement ------------------------------------------------------ */
    const prev = prevBySlug.get(c.slug);
    const regress: string[] = [];
    const wins: string[] = [];
    const imp = c.impressions7d;
    const base = c.baselineImpressions7d;
    if (imp !== null && base !== null) {
      if (base >= REGRESSION_MIN_BASELINE && imp < REGRESSION_IMPRESSIONS_RATIO * base) {
        regress.push(`cluster impressions (7 days) ${imp} vs baseline ${base} (${pct(imp, base)})`);
      } else if (base > 0 && imp >= WIN_IMPRESSIONS_RATIO * base) {
        wins.push(`cluster impressions (7 days) ${imp} vs baseline ${base} (${pct(imp, base)})`);
      } else if (base === 0 && imp >= WIN_FIRST_IMPRESSIONS) {
        wins.push(`started earning impressions: ${imp} in 7 days (baseline 0)`);
      }
    }
    if (c.avgPosition !== null && prev?.avgPosition != null) {
      if (c.avgPosition - prev.avgPosition > REGRESSION_POSITION_DROP) {
        regress.push(`average position ${prev.avgPosition} → ${c.avgPosition} since ${day(prev.checkedAt)}`);
      } else if (c.avgPosition <= 10 && prev.avgPosition > 10) {
        wins.push(`average position into the top 10: ${prev.avgPosition} → ${c.avgPosition}`);
      }
    }
    if (regress.length) {
      const hk = page ? ` (head keyword \`${page.headKeyword}\`)` : "";
      blocks.regressed.push({
        slug: c.slug,
        md:
          `### \`${pathOf(c.finalUrl, c.slug)}\`${hk}\n` +
          regress.map((r) => `- ${r}`).join("\n") +
          `\n- Fix: re-read the page against its §4 brief in the master prompt — confirm the answer-first paragraph, the outline's H2s and the FAQ are still on the page, that the content wasn't thinned or moved behind client-side rendering, and that no newer page now competes for the same queries (merge or differentiate it). Refresh the facts and dates; don't rewrite what still works.`,
      });
    }
    if (wins.length) {
      blocks.wins.push({ slug: c.slug, md: `- \`${pathOf(c.finalUrl, c.slug)}\`: ${wins.join("; ")}` });
    }
  }

  const order: FollowupSectionId[] = ["not_shipped", "fix_shipped", "audit_issues", "regressed", "wins"];
  const actionable = order.some((id) => id !== "wins" && blocks[id].length > 0);
  if (!actionable) return null;

  const shipped = checks.filter((c) => c.shipped).length;
  const indexable = checks.filter((c) => c.shipped && c.indexable !== false).length;
  const impressions7d = sumOrNull(checks.map((c) => c.impressions7d));
  const baselineImpressions7d = sumOrNull(checks.map((c) => c.baselineImpressions7d));
  const checkedAt = checks.reduce((m, c) => (c.checkedAt > m ? c.checkedAt : m), checks[0]?.checkedAt ?? now.toISOString());

  const sections = order
    .filter((id) => blocks[id].length > 0)
    .map((id) => ({ id, title: SECTION_TITLES[id], slugs: blocks[id].map((b) => b.slug) }));

  const summary: FollowupSummary = {
    host: report.host,
    checkedAt,
    pagesPlanned: report.pages.length,
    shipped,
    indexable,
    impressions7d,
    baselineImpressions7d,
    sections,
  };

  const scoreboard =
    `${shipped}/${report.pages.length} pages shipped · ${indexable} indexable · ` +
    `impressions 7d: ${impressions7d ?? "n/a (Search Console not connected)"}` +
    (impressions7d !== null ? ` (baseline ${baselineImpressions7d ?? "n/a"})` : "");

  const shippedUrls = checks.filter((c) => c.shipped).map(liveUrl);
  const auditTargets = [...new Set([...sections.filter((s) => s.id !== "wins").flatMap((s) => s.slugs)])]
    .map((slug) => {
      const c = checks.find((x) => x.slug === slug);
      return c ? liveUrl(c) : `${origin}${slugPath(slug)}`;
    });
  const speedTarget = shippedUrls[0] ?? origin;

  const sectionMd = sections
    .map((s, i) => {
      const intro: Record<FollowupSectionId, string> = {
        not_shipped: `Planned in the master prompt ${pastGrace ? `and still missing ${graceDays}+ days later` : "and missing"}. Each page below carries its full brief — you don't need the original prompt.`,
        fix_shipped: "These pages are live, but a check failed. Each line states what was measured and the exact change.",
        audit_issues: "Issues the static single-page audit found that the strategy's original audit did not report for the same path. Info-level notes are left out.",
        regressed: `Search Console says these lost ground: impressions below ${Math.round(REGRESSION_IMPRESSIONS_RATIO * 100)}% of the strategy-time baseline (baselines under ${REGRESSION_MIN_BASELINE} ignored as noise), or the average position worsened by more than ${REGRESSION_POSITION_DROP} since the previous weekly check.`,
        wins: "Informational — what's working. Don't touch these pages beyond the fixes above.",
      };
      const body = s.id === "wins" ? blocks.wins.map((b) => b.md).join("\n") : blocks[s.id].map((b) => b.md).join("\n\n");
      return `## ${i + 1}. ${s.title}\n\n${intro[s.id]}\n\n${body}`;
    })
    .join("\n\n");

  const prompt = `# SEO follow-up — ${report.host} — ${day(checkedAt)}

Strategy job \`${opts.jobId ?? "unknown"}\`${opts.finishedAt ? ` (finished ${day(opts.finishedAt)})` : ""} · weekly plan check of ${report.pages.length} planned page(s)

**Scoreboard:** ${scoreboard}

You are continuing the SEO work on ${origin}. The original master prompt planned the pages below; a weekly check of the LIVE site (plain HTTP fetch, robots.txt sitemaps, Search Console) found the items in this brief. Work through the sections in order. Every item says what was measured and the exact fix — do only that. Pages not listed passed every check: leave them alone, and keep the master prompt's rules (one intent cluster per page, answer-first writing, no duplicated queries) for anything you touch.

${sectionMd}

## Verification

When the fixes are deployed, run these from \`worker/\` and fix anything they still flag:

\`\`\`bash
${auditTargets.map((u) => `npm run seo:audit -- --single ${u}`).join("\n")}
npm run seo:speed -- ${speedTarget}
\`\`\`

The next weekly plan check re-measures everything above; a follow-up is only written again if the findings change.
`;

  // Wins are informational — a page drifting in or out of that list must
  // not mint a fresh follow-up when the actionable findings are unchanged.
  const pairs = sections
    .filter((s) => s.id !== "wins")
    .flatMap((s) => s.slugs.map((slug) => `${s.id}\u0000${slug}`))
    .sort();
  const fingerprint = createHash("sha256").update(pairs.join("\n")).digest("hex");

  return { summary, prompt, fingerprint };
}
