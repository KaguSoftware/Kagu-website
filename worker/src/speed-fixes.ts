import {
  formatKb,
  formatMs,
  type SpeedReport,
  type StrategyReport,
} from "./speed.js";
import type { Budget } from "./speed-budget.js";

/*
  speed-fixes.ts — turns a speed report into an actionable brief for a coding
  agent, the way seo:strategy emits its master prompt. Both times this tool
  runs, the report's real destination is "apply these fixes" — `--prompt
  fixes.md` formalizes that handoff: context, the current numbers, every
  opportunity/diagnostic/failed audit with its exact culprits, acceptance
  criteria (the --budget values when given, Google's thresholds otherwise),
  and the verification command. Deterministic assembly — no LLM.
*/

const FENCE = "```";

export function composeFixPrompt(report: SpeedReport, budgets: Budget[]): string {
  const mobile = report.reports.find((r) => r.strategy === "mobile");
  const desktop = report.reports.find((r) => r.strategy === "desktop");
  const lead = mobile ?? report.reports[0];

  const lines: string[] = [];
  lines.push(`# Speed fixes for ${report.finalUrl}`);
  lines.push("");
  lines.push(
    `You are a senior web-performance engineer working in this site's repository. ` +
      `Below is a full Lighthouse report for ${report.finalUrl} (Google PageSpeed Insights, ` +
      `run ${new Date(report.fetchedAt).toISOString().slice(0, 10)}; scores and metrics are ` +
      `medians of ${lead.runs} run(s)). Work through the fixes in order — they are sorted by ` +
      `estimated impact. For each fix: find the responsible code, apply the smallest change ` +
      `that resolves it, and note anything you deliberately skip and why. Do not "optimize" ` +
      `things the report doesn't complain about.`
  );
  lines.push("");

  lines.push(`## Where the site stands`);
  lines.push("");
  for (const s of report.reports) {
    lines.push(
      `- **${s.strategy}**: ` +
        s.scores.map((c) => `${c.label} ${c.score}/100`).join(" · ")
    );
  }
  lines.push("");
  lines.push(`| Metric | ${report.reports.map((s) => s.strategy).join(" | ")} |`);
  lines.push(`|---|${report.reports.map(() => "---|").join("")}`);
  for (const m of lead.lab) {
    const cells = report.reports.map((s) => {
      const x = s.lab.find((v) => v.id === m.id);
      return x ? `${x.display} (${x.grade})` : "—";
    });
    lines.push(`| ${m.label} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  const field = (mobile ?? desktop)?.field;
  if (field) {
    lines.push(
      `Real-user field data (CrUX, 28 days, ${field.source}-level): ` +
        field.metrics.map((m) => `${m.label} ${m.display} (${m.grade})`).join(" · ") +
        `. Field data is what Google actually ranks with — a lab win that doesn't move these is cosmetic.`
    );
    lines.push("");
  }

  // Mobile leads (it's the ranking signal); desktop-only issues follow.
  appendStrategyFixes(lines, lead);
  const other = report.reports.find((r) => r !== lead);
  if (other) {
    const knownOpps = new Set(lead.opportunities.map((o) => o.id));
    const knownFindings = new Set(
      lead.categories.flatMap((c) => c.findings.map((f) => f.id))
    );
    const extraOpps = other.opportunities.filter((o) => !knownOpps.has(o.id));
    const extraCats = other.categories
      .map((c) => ({ ...c, findings: c.findings.filter((f) => !knownFindings.has(f.id)) }))
      .filter((c) => c.findings.length > 0);
    if (extraOpps.length > 0 || extraCats.length > 0) {
      lines.push(`## Additional ${other.strategy}-only issues`);
      lines.push("");
      let n = 1;
      for (const o of extraOpps) {
        const savings = [
          o.savingsMs > 0 ? `~${formatMs(o.savingsMs)}` : "",
          o.savingsBytes > 0 ? `~${formatKb(o.savingsBytes)}` : "",
        ]
          .filter(Boolean)
          .join(" / ");
        lines.push(`${n++}. **${o.title}**${savings ? ` — save ${savings}` : ""}`);
        if (o.description) lines.push(`   - Why: ${o.description}`);
        for (const item of o.items) lines.push(`   - Where: ${item}`);
      }
      for (const c of extraCats) {
        for (const f of c.findings) {
          lines.push(`${n++}. **[${c.label}] ${f.title}**${f.displayValue ? ` — ${f.displayValue}` : ""}`);
          if (f.description) lines.push(`   - Why: ${f.description}`);
          for (const item of f.items) lines.push(`   - Where: ${item}`);
        }
      }
      lines.push("");
    }
  }

  lines.push(`## Acceptance criteria`);
  lines.push("");
  if (budgets.length > 0) {
    lines.push(`The build gate below must pass (these are the configured budgets):`);
    lines.push("");
    for (const b of budgets) {
      lines.push(
        `- ${b.label} ${b.kind === "min-score" ? `≥ ${b.value}` : `≤ ${formatBudgetValue(b)}`}`
      );
    }
  } else {
    lines.push(`Google's "good" thresholds, judged on the mobile medians:`);
    lines.push("");
    lines.push(`- Performance score ≥ 90`);
    lines.push(`- Largest Contentful Paint ≤ 2.5s`);
    lines.push(`- Total Blocking Time ≤ 200ms`);
    lines.push(`- Cumulative Layout Shift ≤ 0.1`);
  }
  lines.push("");

  lines.push(`## Verify`);
  lines.push("");
  lines.push(`Re-run the report after the fixes and compare against this one:`);
  lines.push("");
  lines.push(FENCE);
  lines.push(`cd worker`);
  lines.push(`npm run seo:speed -- --json ${report.finalUrl} > after.json`);
  lines.push(
    `npm run seo:speed -- --baseline before.json${budgets.length > 0 ? ` --budget ${budgets.map((b) => `${b.key}=${b.value}`).join(",")}` : ""} ${report.finalUrl}`
  );
  lines.push(FENCE);
  lines.push("");
  lines.push(
    `Lighthouse is noisy (±10 between runs) — judge by the medians, not a single run, ` +
      `and treat a metric as fixed only when its grade changes.`
  );
  lines.push("");

  return lines.join("\n");
}

function formatBudgetValue(b: Budget): string {
  if (b.targetId === "cumulative-layout-shift") return String(b.value);
  return formatMs(b.value);
}

function appendStrategyFixes(lines: string[], s: StrategyReport): void {
  lines.push(`## The fixes (${s.strategy}, biggest win first)`);
  lines.push("");

  let n = 1;
  if (s.opportunities.length > 0) {
    lines.push(`### Performance opportunities`);
    lines.push("");
    for (const o of s.opportunities) {
      const savings = [
        o.savingsMs > 0 ? `~${formatMs(o.savingsMs)}` : "",
        o.savingsBytes > 0 ? `~${formatKb(o.savingsBytes)}` : "",
      ]
        .filter(Boolean)
        .join(" / ");
      lines.push(`${n++}. **${o.title}**${savings ? ` — save ${savings}` : ""}`);
      if (o.description) lines.push(`   - Why: ${o.description}`);
      for (const item of o.items) lines.push(`   - Where: ${item}`);
    }
    lines.push("");
  }

  if (s.diagnostics.length > 0) {
    lines.push(`### Diagnostics — where the time goes (context for the fixes above)`);
    lines.push("");
    for (const d of s.diagnostics) {
      lines.push(`- **${d.title}**${d.display ? `: ${d.display}` : ""}`);
      for (const item of d.items.slice(0, 4)) lines.push(`  - ${item}`);
    }
    lines.push("");
  }

  for (const cat of s.categories) {
    if (cat.findings.length === 0) continue;
    lines.push(`### ${cat.label} (${cat.score}/100) — failed audits`);
    lines.push("");
    for (const f of cat.findings) {
      lines.push(`${n++}. **${f.title}**${f.displayValue ? ` — ${f.displayValue}` : ""}`);
      if (f.description) lines.push(`   - Why: ${f.description}`);
      for (const item of f.items) lines.push(`   - Where: ${item}`);
    }
    lines.push("");
  }
}
