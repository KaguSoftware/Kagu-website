/*
  CLI for PageSpeed Insights + CrUX history. Usage:

    npm run seo:speed -- kagusoftware.com
    npm run seo:speed -- --mobile example.com/pricing    # one strategy only
    npm run seo:speed -- --desktop example.com
    npm run seo:speed -- --runs 5 example.com            # bigger sample (default 3)
    npm run seo:speed -- --json example.com              # machine-readable (progress → stderr)

    # Real-user Core Web Vitals trend, ~40 weeks, no Lighthouse run (CrUX History API):
    npm run seo:speed -- --field-only example.com        # --weeks N to shorten

    # Deploy gate: compare against a saved report and/or enforce budgets
    # (exit code 2 on breach — wire it into a pre-push or post-deploy check):
    npm run seo:speed -- --json example.com > before.json
    npm run seo:speed -- --baseline before.json --budget score=90,lcp=2500 example.com

    # Sample N pages from the sitemap (default 6, mobile-only single runs):
    npm run seo:speed -- --site 8 example.com

    # Side-by-side competitor benchmark:
    npm run seo:speed -- --vs competitor.com example.com

    # Emit an actionable fix brief for a coding agent:
    npm run seo:speed -- --prompt fixes.md example.com

  Runs Google's own Lighthouse (mobile + desktop by default) against the URL
  and prints all four category scores, lab metrics, real-user Core Web Vitals
  (CrUX field data), every performance opportunity with estimated savings,
  and every failed accessibility / best-practices / SEO audit with the exact
  offending elements. Lighthouse is noisy, so each strategy runs
  SEO_SPEED_RUNS times (default 3, `--runs N` overrides; keep it odd) and the
  report judges by the MEDIAN.

  Speed history: when worker/.env has Supabase creds (and
  supabase/seo_speed_module.sql has been applied), every default-mode run
  saves its medians to seo_speed_snapshots and `--field-only` backfills the
  weekly CrUX points — the idle worker then re-checks tracked URLs weekly and
  the admin SEO tab charts the trend. `--no-save` skips this; without creds
  the tool stays fully standalone. A score drop > 5 vs the previous snapshot
  prints a REGRESSION warning.

  Exit codes: 0 ok · 1 error · 2 budget breach.
*/

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatKb,
  formatMetric,
  formatMs,
  runSpeedInsights,
  type MetricGrade,
  type SpeedReport,
  type Strategy,
  type StrategyReport,
} from "./speed.js";
import { CRUX_METRICS, cruxGradeOf, fetchCruxHistory, formatCruxValue, type CruxHistory } from "./crux.js";
import { checkBudgets, parseBudgets, type Budget, type BudgetCheck } from "./speed-budget.js";
import { discoverSiteUrls, runSiteSample, type SitePageResult } from "./speed-site.js";
import { composeFixPrompt } from "./speed-fixes.js";
import { backfillCruxSnapshots, hasDbCreds, saveSpeedSnapshots } from "./speed-tracking.js";

interface CliArgs {
  url: string;
  strategies: Strategy[];
  strategiesExplicit: boolean;
  runs?: number;
  json: boolean;
  save: boolean;
  fieldOnly: boolean;
  weeks?: number;
  siteN?: number;
  vs?: string;
  baselineFile?: string;
  budgets: Budget[];
  promptFile?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    url: "",
    strategies: ["mobile", "desktop"],
    strategiesExplicit: false,
    json: false,
    save: true,
    fieldOnly: false,
    budgets: [],
  };
  let mobile = false;
  let desktop = false;
  const rest: string[] = [];

  const takeValue = (flag: string, current: string, next: () => string | undefined): string => {
    const eq = current.match(/^--[a-z-]+=(.*)$/);
    if (eq) return eq[1];
    const v = next();
    if (v === undefined || v.startsWith("--")) throw new Error(`${flag} needs a value`);
    return v;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[i + 1] === undefined ? undefined : argv[++i];
    if (a === "--json") args.json = true;
    else if (a === "--mobile") mobile = true;
    else if (a === "--desktop") desktop = true;
    else if (a === "--no-save") args.save = false;
    else if (a === "--field-only") args.fieldOnly = true;
    else if (a === "--runs" || a.startsWith("--runs=")) {
      args.runs = Number(takeValue("--runs", a, next)) || undefined;
    } else if (a === "--weeks" || a.startsWith("--weeks=")) {
      args.weeks = Number(takeValue("--weeks", a, next)) || undefined;
    } else if (a === "--site" || a.startsWith("--site=")) {
      // Optional count: `--site 8`, `--site=8`, or bare `--site` (default 6).
      if (a.includes("=")) args.siteN = Number(a.split("=")[1]) || 6;
      else if (/^\d+$/.test(argv[i + 1] ?? "")) args.siteN = Number(argv[++i]);
      else args.siteN = 6;
    } else if (a === "--vs" || a.startsWith("--vs=")) {
      args.vs = takeValue("--vs", a, next);
    } else if (a === "--baseline" || a.startsWith("--baseline=")) {
      args.baselineFile = takeValue("--baseline", a, next);
    } else if (a === "--budget" || a.startsWith("--budget=")) {
      args.budgets = parseBudgets(takeValue("--budget", a, next));
    } else if (a === "--prompt" || a.startsWith("--prompt=")) {
      args.promptFile = takeValue("--prompt", a, next);
    } else if (a.startsWith("--")) {
      throw new Error(`unknown flag ${a}`);
    } else rest.push(a);
  }

  if (mobile && !desktop) args.strategies = ["mobile"];
  if (desktop && !mobile) args.strategies = ["desktop"];
  args.strategiesExplicit = mobile || desktop;
  args.url = rest.join(" ").trim();
  return args;
}

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error("[speed]", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (!args.url) {
    console.error(
      "Usage: npm run seo:speed -- <url>\n" +
        "  (--mobile | --desktop, --runs N, --json, --no-save,\n" +
        "   --field-only [--weeks N], --site [N], --vs <url>,\n" +
        "   --baseline before.json, --budget score=90,lcp=2500, --prompt fixes.md)"
    );
    process.exit(1);
  }

  // --json promises parseable stdout, but the engine narrates progress via
  // console.log — reroute that narration to stderr so `--json url > file`
  // stays valid JSON.
  if (args.json) {
    console.log = (...a: unknown[]) => console.error(...a);
  }

  if (args.fieldOnly) return runFieldOnly(args);
  if (args.siteN !== undefined) return runSite(args);
  if (args.vs) return runVersus(args);
  return runSingle(args);
}

/* ------------------------------------------------------------------------ */
/* Default mode: one URL, full report (+ save/baseline/budget/prompt)       */
/* ------------------------------------------------------------------------ */

async function runSingle(args: CliArgs): Promise<void> {
  const report = await runSpeedInsights(args.url, args.strategies, args.runs);

  if (args.json) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else printReport(report);

  if (args.baselineFile) printBaseline(loadBaseline(args.baselineFile), report);

  let breached = false;
  if (args.budgets.length > 0) {
    const checks = report.reports.flatMap((s) => checkBudgets(args.budgets, s));
    printBudgetChecks(checks);
    breached = checks.some((c) => !c.pass);
  }

  if (args.promptFile) {
    const file = resolve(args.promptFile);
    writeFileSync(file, composeFixPrompt(report, args.budgets), "utf8");
    console.error(`\n[speed] fix brief written to ${file} — paste it into a coding agent`);
  }

  if (args.save && hasDbCreds()) {
    const saved = await saveSpeedSnapshots(report);
    if (saved) {
      for (const r of saved.regressions) {
        console.error(
          `\n[speed] ⚠ REGRESSION (${r.strategy}): performance ${r.from} → ${r.to} vs the last snapshot`
        );
      }
      console.error(
        `[speed] ${saved.saved} snapshot(s) saved — trend in the admin SEO tab; the worker re-checks weekly`
      );
    }
  }

  if (breached) process.exit(2);
}

/* ------------------------------------------------------------------------ */
/* --field-only: CrUX History API trend (no Lighthouse)                     */
/* ------------------------------------------------------------------------ */

async function runFieldOnly(args: CliArgs): Promise<void> {
  const histories: CruxHistory[] = [];
  for (const strategy of args.strategies) {
    const h = await fetchCruxHistory(args.url, strategy, args.weeks ?? 40);
    if (h) histories.push(h);
    else console.error(`[speed] no CrUX ${strategy} record for ${args.url} (too little Chrome traffic)`);
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ url: args.url, histories }, null, 2) + "\n");
  } else if (histories.length > 0) {
    printCruxHistories(args.url, histories);
  }

  if (histories.length === 0) process.exit(1);

  if (args.save && hasDbCreds()) {
    const added = await backfillCruxSnapshots(normalizedUrl(args.url), histories);
    if (added !== null) {
      console.error(
        `\n[speed] ${added} weekly CrUX point(s) backfilled into speed history — trend in the admin SEO tab`
      );
    }
  }
}

function normalizedUrl(raw: string): string {
  return /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
}

function printCruxHistories(url: string, histories: CruxHistory[]): void {
  const line = "─".repeat(72);
  console.log("");
  console.log(line);
  console.log(`Real-user Core Web Vitals history: ${url}`);
  console.log(`source: CrUX History API — 28-day windows ending weekly, p75 of real Chrome users`);
  console.log(line);

  for (const h of histories) {
    console.log(
      `\n════ ${h.strategy.toUpperCase()} ════  (${h.source === "url" ? "this page" : "whole origin"}, ${h.points.length} weeks)\n`
    );
    console.log(
      `  ${pad("week ending", 14)}${CRUX_METRICS.map((m) => pad(m.label, 10)).join("")}`
    );
    for (const p of h.points) {
      const cells = CRUX_METRICS.map((m) => {
        const v = p.metrics[m.id];
        if (v === undefined) return pad("—", 10);
        return pad(`${dot(cruxGradeOf(m.id, v))} ${formatCruxValue(m.id, v)}`, 10);
      });
      console.log(`  ${pad(p.periodEnd, 14)}${cells.join("")}`);
    }

    // Trend: newest vs oldest, per metric.
    const first = h.points[0];
    const last = h.points[h.points.length - 1];
    if (first !== last) {
      const moves: string[] = [];
      for (const m of CRUX_METRICS) {
        const a = first.metrics[m.id];
        const b = last.metrics[m.id];
        if (a === undefined || b === undefined || a === b) continue;
        moves.push(
          `${m.label} ${formatCruxValue(m.id, a)} → ${formatCruxValue(m.id, b)} ${b < a ? "▲ better" : "▼ worse"}`
        );
      }
      if (moves.length > 0) {
        console.log(`\n  since ${first.periodEnd}: ${moves.join(" · ")}`);
      }
    }
  }
  console.log("");
}

/* ------------------------------------------------------------------------ */
/* --site: sample N pages from the sitemap                                  */
/* ------------------------------------------------------------------------ */

async function runSite(args: CliArgs): Promise<void> {
  const n = Math.max(1, Math.min(20, args.siteN ?? 6));
  // Site mode defaults to the cheap sample — mobile only, single run — so a
  // 6-page sample stays ~6 PSI calls. Explicit flags override.
  const strategies = args.strategiesExplicit ? args.strategies : (["mobile"] as Strategy[]);
  const runs = args.runs ?? 1;

  console.log(`[speed] discovering pages via sitemap for ${args.url}…`);
  const urls = await discoverSiteUrls(args.url, n);
  if (urls.length === 0) {
    console.error("[speed] no URLs discovered (no sitemap and no readable homepage links)");
    process.exit(1);
  }
  console.log(
    `[speed] sampling ${urls.length} page(s) — ${strategies.join("+")}, ${runs} run(s) each`
  );
  const results = await runSiteSample(urls, strategies, runs);

  if (args.json) {
    process.stdout.write(JSON.stringify(results, null, 2) + "\n");
  } else {
    printSiteTable(results, strategies);
  }

  let breached = false;
  if (args.budgets.length > 0) {
    const checks = results.flatMap((r) =>
      (r.report?.reports ?? []).flatMap((s) =>
        checkBudgets(args.budgets, s).map((c) => ({ ...c, strategy: `${c.strategy} ${pathOf(r.url)}` }))
      )
    );
    printBudgetChecks(checks);
    breached = checks.some((c) => !c.pass);
  }
  if (breached) process.exit(2);
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search || "/";
  } catch {
    return url;
  }
}

function printSiteTable(results: SitePageResult[], strategies: Strategy[]): void {
  const line = "─".repeat(72);
  for (const strategy of strategies) {
    const rows = results
      .map((r) => ({ url: r.url, s: r.report?.reports.find((x) => x.strategy === strategy) }))
      .filter((r): r is { url: string; s: StrategyReport } => Boolean(r.s))
      .sort((a, b) => a.s.score - b.s.score); // worst first

    console.log("");
    console.log(line);
    console.log(`Site sample — ${strategy.toUpperCase()} (worst first)`);
    console.log(line);
    console.log(
      `  ${pad("PAGE", 34)}${pad("PERF", 6)}${pad("A11Y", 6)}${pad("BP", 6)}${pad("SEO", 6)}${pad("LCP", 9)}${pad("CLS", 8)}TBT`
    );
    for (const { url, s } of rows) {
      const cat = (id: string) => {
        const c = s.scores.find((x) => x.id === id);
        return c ? String(c.score) : "—";
      };
      const lab = (id: string) => {
        const m = s.lab.find((x) => x.id === id);
        return m ? m.display : "—";
      };
      const path = pathOf(url);
      console.log(
        `  ${pad(path.length > 32 ? `…${path.slice(-31)}` : path, 34)}` +
          `${pad(cat("performance"), 6)}${pad(cat("accessibility"), 6)}${pad(cat("best-practices"), 6)}${pad(cat("seo"), 6)}` +
          `${pad(lab("largest-contentful-paint"), 9)}${pad(lab("cumulative-layout-shift"), 8)}${lab("total-blocking-time")}`
      );
    }
    for (const r of results.filter((x) => !x.report)) {
      console.log(`  ${pad(pathOf(r.url), 34)}failed: ${r.error}`);
    }

    // The worst page gets its top opportunities inline — that's the page the
    // homepage report would never have shown you.
    const worst = rows[0];
    if (worst && worst.s.opportunities.length > 0) {
      console.log(`\n  WORST OFFENDER: ${pathOf(worst.url)} (${worst.s.score}/100) — top opportunities\n`);
      worst.s.opportunities.slice(0, 3).forEach((o, i) => {
        const savings = [
          o.savingsMs > 0 ? formatMs(o.savingsMs) : "",
          o.savingsBytes > 0 ? formatKb(o.savingsBytes) : "",
        ]
          .filter(Boolean)
          .join(" / ");
        console.log(`  ${i + 1}. ${o.title}${savings ? ` — save ~${savings}` : ""}`);
        for (const item of o.items.slice(0, 2)) console.log(`     ${item}`);
      });
      console.log(`\n  full detail: npm run seo:speed -- --${strategy} ${worst.url}`);
    }
    console.log("");
  }
}

/* ------------------------------------------------------------------------ */
/* --vs: side-by-side competitor benchmark                                  */
/* ------------------------------------------------------------------------ */

async function runVersus(args: CliArgs): Promise<void> {
  console.log(`[speed] benchmarking ${args.url} vs ${args.vs}…`);
  const mine = await runSpeedInsights(args.url, args.strategies, args.runs);
  const theirs = await runSpeedInsights(args.vs!, args.strategies, args.runs);

  if (args.json) {
    process.stdout.write(JSON.stringify({ mine, theirs }, null, 2) + "\n");
    return;
  }

  const line = "─".repeat(72);
  console.log("");
  console.log(line);
  console.log(`Head-to-head: ${hostLabel(mine)}  vs  ${hostLabel(theirs)}`);
  console.log(`medians of ${mine.reports[0]?.runs ?? "?"} run(s) each — speed is a ranking tiebreaker`);
  console.log(line);

  for (const strategy of args.strategies) {
    const a = mine.reports.find((r) => r.strategy === strategy);
    const b = theirs.reports.find((r) => r.strategy === strategy);
    if (!a || !b) continue;

    console.log(`\n════ ${strategy.toUpperCase()} ════\n`);
    console.log(`  ${pad("", 28)}${pad(hostLabel(mine), 20)}${hostLabel(theirs)}`);
    for (const c of a.scores) {
      const other = b.scores.find((s) => s.id === c.id);
      console.log(
        `  ${pad(c.label.toUpperCase(), 28)}${pad(`${c.score}`, 18)}${verdict(c.score, other?.score, true)} ${other ? other.score : "—"}`
      );
    }
    console.log("");
    for (const m of a.lab) {
      const other = b.lab.find((x) => x.id === m.id);
      console.log(
        `  ${pad(m.label, 28)}${pad(m.display, 18)}${verdict(m.value, other?.value, false)} ${other ? other.display : "—"}`
      );
    }
    // Field p75s — the real-user comparison, when both sites have traffic.
    if (a.field && b.field) {
      console.log(`\n  field (p75, 28 days):`);
      for (const m of a.field.metrics) {
        const other = b.field.metrics.find((x) => x.id === m.id);
        if (!other) continue;
        console.log(
          `  ${pad(m.label, 28)}${pad(m.display, 18)}${verdict(m.percentile, other.percentile, false)} ${other.display}`
        );
      }
    }
  }
  console.log("");
}

function hostLabel(r: SpeedReport): string {
  try {
    return new URL(r.finalUrl).hostname.replace(/^www\./, "");
  } catch {
    return r.url;
  }
}

/** ◀ we win · ▶ they win · = tie. `higherWins` for scores, inverse for ms. */
function verdict(ours: number, theirs: number | undefined, higherWins: boolean): string {
  if (theirs === undefined || ours === theirs) return "=";
  const weWin = higherWins ? ours > theirs : ours < theirs;
  return weWin ? "◀" : "▶";
}

/* ------------------------------------------------------------------------ */
/* --baseline: deltas vs a saved --json report                              */
/* ------------------------------------------------------------------------ */

/* Saved via shell redirection, so the file may carry npm banner / progress
   lines before the JSON — parse from the first line that starts the object. */
function loadBaseline(file: string): SpeedReport {
  const raw = readFileSync(resolve(file), "utf8");
  const start = raw.indexOf("{");
  if (start === -1) throw new Error(`${file} contains no JSON object`);
  const parsed = JSON.parse(raw.slice(start)) as SpeedReport;
  if (!Array.isArray(parsed.reports)) throw new Error(`${file} is not a saved speed report`);
  return parsed;
}

function printBaseline(before: SpeedReport, after: SpeedReport): void {
  const line = "─".repeat(72);
  console.log("");
  console.log(line);
  console.log(
    `BASELINE COMPARE — vs ${before.finalUrl} fetched ${before.fetchedAt.slice(0, 10)}`
  );
  console.log(line);

  for (const now of after.reports) {
    const then = before.reports.find((r) => r.strategy === now.strategy);
    if (!then) continue;
    console.log(`\n════ ${now.strategy.toUpperCase()} ════\n`);
    for (const c of now.scores) {
      const prev = then.scores.find((s) => s.id === c.id);
      if (!prev) continue;
      const diff = c.score - prev.score;
      console.log(
        `  ${pad(c.label.toUpperCase(), 28)}${pad(`${prev.score} → ${c.score}`, 16)}${trend(diff, true)}`
      );
    }
    console.log("");
    for (const m of now.lab) {
      const prev = then.lab.find((x) => x.id === m.id);
      if (!prev) continue;
      const diff = m.value - prev.value;
      console.log(
        `  ${pad(m.label, 28)}${pad(`${prev.display} → ${m.display}`, 24)}${trend(diff, false, m.id)}`
      );
    }
  }
  console.log(
    `\n  Lighthouse noise is real (±10 on the score between runs) — treat small\n  deltas as noise; trust grade changes and repeated movement.`
  );
}

/** Signed delta with direction: scores up = better, metrics down = better. */
function trend(diff: number, higherBetter: boolean, metricId?: string): string {
  if (diff === 0) return "=";
  const better = higherBetter ? diff > 0 : diff < 0;
  const amount = metricId ? formatMetric(metricId, Math.abs(diff)) : String(Math.abs(diff));
  return `${better ? "▲" : "▼"} ${diff > 0 ? "+" : "-"}${amount} ${better ? "(better)" : "(worse)"}`;
}

/* ------------------------------------------------------------------------ */
/* --budget: PASS/FAIL lines                                                */
/* ------------------------------------------------------------------------ */

function printBudgetChecks(checks: BudgetCheck[]): void {
  console.log("");
  console.log("─".repeat(72));
  console.log("BUDGETS");
  console.log("─".repeat(72));
  for (const c of checks) {
    const mark = c.pass ? "PASS" : "FAIL";
    console.log(
      `  ${pad(mark, 6)}${pad(c.budget.label, 28)}${pad(c.limitDisplay, 12)}actual ${c.actualDisplay}  (${c.strategy})`
    );
  }
  const failed = checks.filter((c) => !c.pass).length;
  console.log(
    failed > 0
      ? `\n  ${failed} budget(s) breached — exiting 2.`
      : `\n  all budgets pass.`
  );
}

/* ------------------------------------------------------------------------ */
/* Full single-URL report printer                                           */
/* ------------------------------------------------------------------------ */

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
  for (const c of s.scores) {
    console.log(`  ${pad(c.label.toUpperCase(), 16)}${bar(c.score)}  ${c.score}/100`);
  }
  if (s.runs > 1) {
    console.log(`  judged by median of ${s.runs} runs — performance per run: ${s.runScores.join(" / ")}`);
  }
  console.log("");

  console.log(`  LAB METRICS (${s.runs > 1 ? `median of ${s.runs} throttled runs` : "this run, throttled"})`);
  for (const m of s.lab) {
    const spread =
      m.min !== undefined && m.max !== undefined && m.max > m.min
        ? `  [${formatMetric(m.id, m.min)} – ${formatMetric(m.id, m.max)}]`
        : "";
    console.log(`    ${dot(m.grade)} ${pad(m.label, 26)}${pad(m.display, 10)}${m.grade}${spread}`);
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

  for (const cat of s.categories) {
    if (cat.findings.length === 0) {
      console.log(`  ${cat.label.toUpperCase()} (${cat.score}/100): all audits pass.\n`);
      continue;
    }
    console.log(`  ${cat.label.toUpperCase()} (${cat.score}/100) — ${cat.findings.length} failed audit(s)\n`);
    cat.findings.forEach((f, i) => {
      console.log(`  ${String(i + 1).padStart(3)}. ${f.title}${f.displayValue ? ` — ${f.displayValue}` : ""}`);
      if (f.description) console.log(`       why:   ${f.description}`);
      f.items.forEach((item, idx) => {
        console.log(`       ${idx === 0 ? "where: " : "       "}${item}`);
      });
      console.log("");
    });
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
