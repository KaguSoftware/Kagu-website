/*
  CLI for the SEO strategy tool. Usage:

    npm run seo:strategy -- kagusoftware.com
    npm run seo:strategy -- --context "our highlight: fully custom systems per request" example.com
    npm run seo:strategy -- --out brief.md example.com     # choose the output file
    npm run seo:strategy -- --serp 6 example.com           # fewer live SERP checks
    npm run seo:strategy -- --no-audit example.com         # skip the technical audit
    npm run seo:strategy -- --json example.com             # full report as JSON

  Reads the site, understands the business (Groq), generates customer
  searches per intent, checks them against the live SERP, builds head
  keywords + a deduplicated long-tail page plan, runs the technical audit,
  and writes ONE master prompt (markdown) to hand to a coding agent — pages,
  writing rules for AI Overviews, audit fixes, robots/llms.txt/sitemap/
  JSON-LD setup, anti-duplication rules.
*/

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSeoStrategy, type StrategyReport } from "./strategy.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json");
  const noAudit = args.includes("--no-audit");

  let out: string | undefined;
  let ownerNotes: string | undefined;
  let serpQueries: number | undefined;
  let sitePages: number | undefined;
  let auditPages: number | undefined = noAudit ? 0 : undefined;

  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json" || a === "--no-audit") continue;
    if (a === "--out") { out = args[++i]; continue; }
    if (a === "--context") { ownerNotes = args[++i]; continue; }
    if (a === "--serp") { serpQueries = Number(args[++i]) || undefined; continue; }
    if (a === "--site-pages") { sitePages = Number(args[++i]) || undefined; continue; }
    if (a === "--audit-pages") { auditPages = Number(args[++i]) || auditPages; continue; }
    const eq = a.match(/^--(out|context|serp|site-pages|audit-pages)=(.+)$/);
    if (eq) {
      if (eq[1] === "out") out = eq[2];
      else if (eq[1] === "context") ownerNotes = eq[2];
      else if (eq[1] === "serp") serpQueries = Number(eq[2]) || undefined;
      else if (eq[1] === "site-pages") sitePages = Number(eq[2]) || undefined;
      else auditPages = Number(eq[2]) || auditPages;
      continue;
    }
    rest.push(a);
  }
  // A URL never contains spaces — when several bare args remain, the last is
  // the URL and the rest are almost always an unquoted --context sentence.
  let url = rest.join(" ").trim();
  if (rest.length > 1) {
    url = rest[rest.length - 1];
    const stray = rest.slice(0, -1).join(" ");
    ownerNotes = ownerNotes ? `${ownerNotes} ${stray}` : stray;
    console.warn(
      `[strategy] treating "${stray}" as --context and "${url}" as the URL (quote the context next time)`
    );
  }

  if (!url) {
    console.error(
      'Usage: npm run seo:strategy -- <url>   (--context "owner notes", --out FILE, --serp N, --site-pages N, --audit-pages N, --no-audit, --json)'
    );
    process.exit(1);
  }

  const report = await buildSeoStrategy(url, { serpQueries, sitePages, auditPages, ownerNotes });

  if (jsonOut) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }

  const file = resolve(out ?? `seo-strategy-${report.host.replace(/[^a-z0-9.-]/gi, "_")}.md`);
  writeFileSync(file, report.prompt, "utf8");
  printSummary(report, file);
}

function printSummary(r: StrategyReport, file: string): void {
  const line = "─".repeat(72);
  const u = r.understanding;

  console.log("");
  console.log(line);
  console.log(`SEO strategy: ${r.url}`);
  console.log(
    `${u.brand} — ${u.sector}${u.subSector ? ` / ${u.subSector}` : ""} · ` +
      `${u.languages.join("+")} · ${u.locations}`
  );
  if (u.coreValueProposition) console.log(`core: ${u.coreValueProposition}`);
  if (u.offerings.length) console.log(`offers: ${u.offerings.join("; ")}`);
  console.log(line);

  if (r.searchesChecked.length) {
    const typed = r.searchesChecked.reduce((s, e) => s + e.suggestions.length, 0);
    console.log(`\nSERP + DEMAND CHECKS (${r.searchesChecked.length} searches, ${typed} real typed queries via autocomplete)`);
    for (const e of r.searchesChecked) {
      const ours = e.error
        ? `SERP failed (${e.error.slice(0, 60)})`
        : e.siteRank
          ? `we rank #${e.siteRank}`
          : "not in top results";
      console.log(
        `  [${e.intent.slice(0, 4)}] "${e.query}" → ${ours} · ${e.suggestions.length} typed variants`
      );
    }
  }

  if (r.gsc === null) {
    console.log("\nGSC: not connected — worker/README.md shows the free 5-minute setup (real impression data)");
  } else if (r.gsc.length === 0) {
    console.log("\nGSC: connected — no impressions recorded yet (starting from zero; re-run after pages ship to track movement)");
  } else {
    const striking = r.gsc.filter((g) => g.position >= 8 && g.position <= 30 && g.impressions >= 5);
    console.log(
      `\nGSC: ${r.gsc.length} real queries with impressions · ${striking.length} in striking distance (pos 8–30)`
    );
    for (const g of striking.slice(0, 5)) {
      console.log(`  "${g.query}" — ${g.impressions} impressions, avg pos ${g.position}`);
    }
  }

  if (r.headKeywords.length) {
    console.log(`\nHEAD KEYWORDS (${r.headKeywords.length})`);
    for (const h of r.headKeywords) {
      console.log(
        `  ${h.keyword}  (${h.intent}, ${h.winnability})${h.rationale ? ` — ${h.rationale}` : ""}`
      );
    }
  }

  console.log(
    `\nPAGE PLAN (${r.pages.length} page(s)` +
      (r.duplicatesRemoved ? `, ${r.duplicatesRemoved} duplicate quer(y/ies) pruned` : "") +
      `)`
  );
  for (const p of r.pages) {
    console.log(
      `  ${p.action.toUpperCase().padEnd(6)} ${p.slug}  [${p.pageType}/${p.intent}/${p.language}] ` +
        `head: ${p.headKeyword} · ${p.tailQueries.length} tails · ${p.faq.length} FAQ`
    );
  }

  console.log(
    `\nAUDIT: ${r.audit ? `${r.audit.score}/100 — ${r.audit.findings.length} issue(s), fixes embedded in the prompt` : "skipped/unavailable (prompt says to run it separately)"}`
  );

  console.log(`\nPROMPT → ${file} (${Math.round(r.prompt.length / 1024)} KB)`);
  console.log("Paste it into your coding agent inside the site's repo.\n");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[strategy] failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
