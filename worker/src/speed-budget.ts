import { formatMetric, type StrategyReport } from "./speed.js";

/*
  speed-budget.ts — performance budgets for the speed tool.

  `--budget score=90,lcp=2500,cls=0.1` turns a speed report into a deploy
  gate: every budget is checked against the report's MEDIANS (per strategy),
  breaches print as FAIL lines, and the CLI exits 2 so a pre-push hook or a
  post-deploy check against the Vercel preview URL can be a one-liner.

  Score budgets (score/a11y/bp/seo) are minimums, 0–100. Metric budgets
  (lcp/fcp/tbt/si/ttfb in ms, cls unitless) are maximums.
*/

export interface Budget {
  key: string;
  label: string;
  kind: "min-score" | "max-metric";
  /** scores: CategoryScore id · metrics: LabMetric id */
  targetId: string;
  value: number;
}

const BUDGET_KEYS: Record<string, { label: string; kind: Budget["kind"]; targetId: string }> = {
  score: { label: "Performance score", kind: "min-score", targetId: "performance" },
  perf: { label: "Performance score", kind: "min-score", targetId: "performance" },
  a11y: { label: "Accessibility score", kind: "min-score", targetId: "accessibility" },
  accessibility: { label: "Accessibility score", kind: "min-score", targetId: "accessibility" },
  bp: { label: "Best Practices score", kind: "min-score", targetId: "best-practices" },
  seo: { label: "SEO score", kind: "min-score", targetId: "seo" },
  fcp: { label: "First Contentful Paint", kind: "max-metric", targetId: "first-contentful-paint" },
  lcp: { label: "Largest Contentful Paint", kind: "max-metric", targetId: "largest-contentful-paint" },
  tbt: { label: "Total Blocking Time", kind: "max-metric", targetId: "total-blocking-time" },
  cls: { label: "Cumulative Layout Shift", kind: "max-metric", targetId: "cumulative-layout-shift" },
  si: { label: "Speed Index", kind: "max-metric", targetId: "speed-index" },
  ttfb: { label: "Time to First Byte", kind: "max-metric", targetId: "server-response-time" },
};

/** Throws on unknown keys/bad numbers — a silently ignored budget is a hole
 *  in the gate. */
export function parseBudgets(spec: string): Budget[] {
  const budgets: Budget[] = [];
  for (const part of spec.split(",").map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^([a-z0-9]+)\s*=\s*([\d.]+)$/i);
    if (!m) throw new Error(`bad budget "${part}" — expected key=value (e.g. score=90,lcp=2500)`);
    const def = BUDGET_KEYS[m[1].toLowerCase()];
    if (!def) {
      throw new Error(
        `unknown budget key "${m[1]}" — known: ${Object.keys(BUDGET_KEYS).join(", ")}`
      );
    }
    const value = Number(m[2]);
    if (!Number.isFinite(value)) throw new Error(`bad budget value in "${part}"`);
    budgets.push({ key: m[1].toLowerCase(), label: def.label, kind: def.kind, targetId: def.targetId, value });
  }
  return budgets;
}

export interface BudgetCheck {
  budget: Budget;
  strategy: string;
  /** null = the report doesn't carry this metric (treated as a pass). */
  actual: number | null;
  actualDisplay: string;
  limitDisplay: string;
  pass: boolean;
}

export function checkBudgets(budgets: Budget[], report: StrategyReport): BudgetCheck[] {
  return budgets.map((b) => {
    let actual: number | null = null;
    if (b.kind === "min-score") {
      actual = report.scores.find((s) => s.id === b.targetId)?.score ?? null;
    } else {
      actual = report.lab.find((m) => m.id === b.targetId)?.value ?? null;
    }
    const pass = actual === null || (b.kind === "min-score" ? actual >= b.value : actual <= b.value);
    return {
      budget: b,
      strategy: report.strategy,
      actual,
      actualDisplay:
        actual === null
          ? "n/a"
          : b.kind === "min-score"
            ? `${actual}`
            : formatMetric(b.targetId, actual),
      limitDisplay:
        b.kind === "min-score" ? `≥ ${b.value}` : `≤ ${formatMetric(b.targetId, b.value)}`,
      pass,
    };
  });
}
