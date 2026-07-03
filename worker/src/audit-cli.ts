/*
  CLI for the SEO site audit. Usage:

    npm run seo:audit -- https://example.com
    npm run seo:audit -- --single example.com/pricing    # just that one page
    npm run seo:audit -- --max-pages 20 example.com      # crawl deeper
    npm run seo:audit -- --json example.com              # machine-readable

  Crawls the site (start page → sitemap URLs → internal links, capped at
  SEO_AUDIT_MAX_PAGES / --max-pages), renders every page as a throttled
  mobile device (Google indexes mobile-first), and prints an overall score,
  per-category and per-page scores, and every issue found — each with what's
  wrong, WHY it matters for ranking, WHERE exactly (the offending elements),
  which pages it affects, and the concrete fix.
*/

import { auditSite, type AuditReport, type Severity } from "./audit.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json");
  const single = args.includes("--single");

  let maxPages: number | undefined = single ? 1 : undefined;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json" || a === "--single") continue;
    if (a === "--max-pages") {
      maxPages = Number(args[++i]) || maxPages;
      continue;
    }
    const eq = a.match(/^--max-pages=(\d+)$/);
    if (eq) {
      maxPages = Number(eq[1]);
      continue;
    }
    rest.push(a);
  }
  const url = rest.join(" ").trim();

  if (!url) {
    console.error(
      "Usage: npm run seo:audit -- <url>   (--single = one page, --max-pages N, --json)"
    );
    process.exit(1);
  }

  const report = await auditSite(url, { maxPages });

  if (jsonOut) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  printReport(report);
}

function printReport(r: AuditReport): void {
  const line = "─".repeat(72);
  console.log("");
  console.log(line);
  console.log(`SEO site audit: ${r.url}`);
  console.log(
    `host: ${r.siteHost}  •  ${r.pages.length} page(s) audited (cap ${r.maxPages})  •  ` +
      `mobile-rendered, throttled 4G`
  );
  console.log(line);

  console.log(`\n  OVERALL SCORE: ${bar(r.score)}  ${r.score}/100\n`);

  for (const cat of r.categories) {
    const score = cat.score === null ? "  n/a" : String(cat.score).padStart(5);
    console.log(`  ${pad(cat.label, 22)}${cat.score === null ? "          " : bar(cat.score)}${score}`);
  }

  console.log(`\nPAGES`);
  console.log(`  ${pad("SCORE", 7)}${pad("LCP", 7)}${pad("WEIGHT", 9)}PAGE`);
  for (const p of r.pages) {
    const lcp = p.metrics.lcpMs ? sec(p.metrics.lcpMs) : "—";
    const weight = p.metrics.pageWeightBytes
      ? `${(p.metrics.pageWeightBytes / 1024 / 1024).toFixed(1)}MB`
      : "—";
    const note = p.error ? `  (FETCH FAILED: ${p.error})` : p.renderOk ? "" : "  (static only)";
    console.log(`  ${pad(String(p.score), 7)}${pad(lcp, 7)}${pad(weight, 9)}${pathOf(p.finalUrl)}${note}`);
  }

  if (r.findings.length === 0) {
    console.log("\nNo issues found — clean audit.");
  } else {
    console.log(`\nISSUES TO FIX (${r.findings.length})\n`);
    r.findings.forEach((f, i) => {
      console.log(`${String(i + 1).padStart(3)}. ${tag(f.severity)} ${f.label} — ${f.issue}`);
      if (f.why) console.log(`       why:   ${f.why}`);
      for (let s = 0; s < Math.min(f.specifics.length, 8); s++) {
        console.log(`       ${s === 0 ? "where: " : "       "}${f.specifics[s]}`);
      }
      if (f.specifics.length > 8) console.log(`              …and ${f.specifics.length - 8} more`);
      if (r.pages.length > 1 && f.pages.length > 0 && f.pages.length < r.pages.length) {
        console.log(`       pages: ${f.pages.slice(0, 6).join(", ")}${f.pages.length > 6 ? ` +${f.pages.length - 6} more` : ""}`);
      } else if (r.pages.length > 1 && f.pages.length === r.pages.length) {
        console.log(`       pages: all ${f.pages.length} audited pages`);
      }
      console.log(`       fix:   ${f.fix}\n`);
    });
  }

  if (r.passed.length > 0) {
    console.log(`PASSED EVERYWHERE (${r.passed.length}): ${r.passed.join(" • ")}`);
  }
  console.log("");
}

function tag(severity: Severity): string {
  return severity === "error" ? "[ERROR]" : severity === "warn" ? "[WARN] " : "[INFO] ";
}

function bar(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)));
  return "▮".repeat(filled) + "▯".repeat(10 - filled);
}

function sec(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function pad(s: string, width: number): string {
  return s.length >= width ? s + " " : s + " ".repeat(width - s.length);
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname || "/") + u.search;
  } catch {
    return url;
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[audit] failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
