/*
  CLI for PageSpeed Insights. Usage:

    npm run seo:speed -- kagusoftware.com
    npm run seo:speed -- --mobile example.com/pricing   # one strategy only
    npm run seo:speed -- --desktop example.com
    npm run seo:speed -- --json example.com             # machine-readable

  Runs Google's own Lighthouse (mobile + desktop by default) against the URL
  and prints the performance score, lab metrics, real-user Core Web Vitals
  (CrUX field data, when the site has enough Chrome traffic), and every
  optimization opportunity with its estimated savings and the exact offending
  resources. Free API; set PSI_API_KEY in worker/.env for a bigger quota.
*/

import {
  formatKb,
  formatMs,
  runSpeedInsights,
  type MetricGrade,
  type SpeedReport,
  type Strategy,
  type StrategyReport,
} from "./speed.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json");

  let strategies: Strategy[] = ["mobile", "desktop"];
  if (args.includes("--mobile") && !args.includes("--desktop")) strategies = ["mobile"];
  if (args.includes("--desktop") && !args.includes("--mobile")) strategies = ["desktop"];

  const url = args
    .filter((a) => !["--json", "--mobile", "--desktop"].includes(a))
    .join(" ")
    .trim();

  if (!url) {
    console.error("Usage: npm run seo:speed -- <url>   (--mobile | --desktop, --json)");
    process.exit(1);
  }

  const report = await runSpeedInsights(url, strategies);

  if (jsonOut) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  printReport(report);
}

function printReport(r: SpeedReport): void {
  const line = "─".repeat(72);
  console.log("");
  console.log(line);
  console.log(`Speed insights: ${r.finalUrl}`);
  console.log(`source: Google PageSpeed Insights (real Lighthouse run on Google's infra)`);
  console.log(line);

  for (const s of r.reports) printStrategy(s);
}

function printStrategy(s: StrategyReport): void {
  console.log(`\n════ ${s.strategy.toUpperCase()} ════  (Lighthouse ${s.lighthouseVersion})\n`);
  console.log(`  PERFORMANCE SCORE: ${bar(s.score)}  ${s.score}/100\n`);

  console.log(`  LAB METRICS (this run, throttled)`);
  for (const m of s.lab) {
    console.log(`    ${dot(m.grade)} ${pad(m.label, 26)}${pad(m.display, 10)}${m.grade}`);
  }

  if (s.field) {
    console.log(
      `\n  FIELD DATA — real Chrome users, 28 days (${s.field.source}-level` +
        `${s.field.overall ? `, overall: ${s.field.overall}` : ""})`
    );
    for (const m of s.field.metrics) {
      console.log(`    ${dot(m.grade)} ${pad(m.label, 26)}${pad(m.display, 10)}${m.grade}  (p75)`);
    }
  } else {
    console.log(`\n  FIELD DATA: none — not enough Chrome-user traffic in CrUX yet.`);
  }

  if (s.opportunities.length > 0) {
    console.log(`\n  OPPORTUNITIES (${s.opportunities.length}) — estimated savings if fixed\n`);
    s.opportunities.forEach((o, i) => {
      const savings = [
        o.savingsMs > 0 ? formatMs(o.savingsMs) : "",
        o.savingsBytes > 0 ? formatKb(o.savingsBytes) : "",
      ]
        .filter(Boolean)
        .join(" / ");
      console.log(`  ${String(i + 1).padStart(3)}. ${o.title}${savings ? ` — save ~${savings}` : ""}`);
      if (o.description) console.log(`       why:   ${o.description}`);
      o.items.forEach((item, idx) => {
        console.log(`       ${idx === 0 ? "where: " : "       "}${item}`);
      });
      console.log("");
    });
  } else {
    console.log(`\n  OPPORTUNITIES: none — Lighthouse found nothing left to save.`);
  }

  if (s.diagnostics.length > 0) {
    console.log(`  DIAGNOSTICS — where the time goes\n`);
    for (const d of s.diagnostics) {
      console.log(`    • ${d.title}${d.display ? `: ${d.display}` : ""}`);
      for (const item of d.items.slice(0, 4)) console.log(`        ${item}`);
    }
    console.log("");
  }
}

function dot(grade: MetricGrade): string {
  return grade === "good" ? "●" : grade === "needs-improvement" ? "◐" : "○";
}

function bar(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)));
  return "▮".repeat(filled) + "▯".repeat(10 - filled);
}

function pad(s: string, width: number): string {
  return s.length >= width ? s + " " : s + " ".repeat(width - s.length);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[speed] failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
);
