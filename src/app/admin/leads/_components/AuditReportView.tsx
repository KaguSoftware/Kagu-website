import type { SeoAuditFinding, SeoAuditReport } from "@/lib/supabase/database.types";
import { Eyebrow, Tip } from "../../_components/ui";
import { ProgressBar } from "./ProgressBar";
import {
  SEO_AUDIT_SEVERITY_CLASSES,
  seoAuditScoreClass,
  seoAuditScoreTone,
} from "../_lib/constants";

/*
  Renders a full AuditReport — overall + category scores, per-page metrics,
  finding cards, passed checks. Shared by the audit detail page and the
  strategy detail page (a strategy job embeds the same report).
*/

const sec = (ms: number | null) => (ms ? `${(ms / 1000).toFixed(1)}s` : "—");
const mb = (bytes: number | null) =>
  bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "—";

function FindingCard({ finding }: { finding: SeoAuditFinding }) {
  return (
    <div className="ld-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span
          className={`ld-pill ${
            SEO_AUDIT_SEVERITY_CLASSES[finding.severity] ?? "ld-pill--neutral"
          }`}
        >
          {finding.severity}
        </span>
        <span className="text-[15px] font-medium text-ink">{finding.label}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink">{finding.issue}</p>
      {finding.why ? (
        <p className="ld-small mt-2">
          <span className="ld-inline-lbl">Why · </span>
          {finding.why}
        </p>
      ) : null}
      {finding.specifics.length > 0 && (
        <ul className="mt-3 flex flex-col gap-0.5">
          {finding.specifics.slice(0, 8).map((s, i) => (
            <li key={i} className="min-w-0">
              <Tip text={s}>
                <span className="ld-code ld-t-muted block max-w-full truncate">{s}</span>
              </Tip>
            </li>
          ))}
          {finding.specifics.length > 8 && (
            <li className="ld-code ld-t-muted">
              …and {finding.specifics.length - 8} more
            </li>
          )}
        </ul>
      )}
      {finding.pages.length > 0 && (
        <p className="ld-small mt-2">
          <span className="ld-inline-lbl">Pages · </span>
          {finding.pages.slice(0, 6).join(", ")}
          {finding.pages.length > 6 ? ` +${finding.pages.length - 6} more` : ""}
        </p>
      )}
      <p className="ld-note ld-fix">
        <b>Fix · </b>
        {finding.fix}
      </p>
    </div>
  );
}

export function AuditReportView({ report }: { report: SeoAuditReport }) {
  return (
    <>
      {/* Overall + per-category scores. */}
      <div className="ld-card flex flex-wrap items-start gap-x-14 gap-y-8">
        <div>
          <Eyebrow>Overall score</Eyebrow>
          <p
            className={`ld-big mt-3 ${seoAuditScoreClass(report.score)}`}
          >
            {report.score}
            <span className="ml-1 text-xl text-slate-ink">/100</span>
          </p>
        </div>
        <div className="grid min-w-64 flex-1 grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
          {report.categories.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-[13px] text-slate-ink">
                {cat.label}
              </span>
              {cat.score === null ? (
                <span className="ld-small">n/a</span>
              ) : (
                <div className="ld-meter-row min-w-0 flex-1">
                  <ProgressBar value={cat.score} tone={seoAuditScoreTone(cat.score)} />
                  <span
                    className={`w-8 text-right text-[13px] font-medium ${seoAuditScoreClass(cat.score)}`}
                  >
                    {cat.score}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Per-page scores + lab metrics. */}
      <div>
        <Eyebrow>Pages</Eyebrow>
        <div className="ld-wrap mt-3">
          <table className="ld-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>LCP</th>
                <th>CLS</th>
                <th>Weight</th>
                <th>Requests</th>
                <th>Page</th>
              </tr>
            </thead>
            <tbody>
              {report.pages.map((page) => {
                let path = page.finalUrl;
                try {
                  const u = new URL(page.finalUrl);
                  path = (u.pathname || "/") + u.search;
                } catch {
                  /* keep full url */
                }
                return (
                  <tr key={page.finalUrl}>
                    <td className={`font-medium ${seoAuditScoreClass(page.score)}`}>
                      {page.score}
                    </td>
                    <td className="ld-t-muted">{sec(page.metrics.lcpMs)}</td>
                    <td className="ld-t-muted">{page.metrics.cls ?? "—"}</td>
                    <td className="ld-t-muted">{mb(page.metrics.pageWeightBytes)}</td>
                    <td className="ld-t-muted">{page.metrics.requestCount ?? "—"}</td>
                    <td>
                      <a
                        href={page.finalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ld-link"
                      >
                        {path}
                      </a>
                      {page.error ? (
                        <span className="ld-small ld-t-bad ml-2">fetch failed</span>
                      ) : !page.renderOk ? (
                        <span className="ld-small ld-t-warn ml-2">static only</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Every issue, most severe first — why, where, fix. */}
      <div>
        <Eyebrow>Issues to fix ({report.findings.length})</Eyebrow>
        {report.findings.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3">
            {report.findings.map((finding, i) => (
              <FindingCard key={`${finding.label}-${i}`} finding={finding} />
            ))}
          </div>
        ) : (
          <p className="ld-empty-note mt-3">Clean audit — nothing to fix.</p>
        )}
      </div>

      {/* Checks that passed on every page they applied to. */}
      {report.passed.length > 0 && (
        <div>
          <Eyebrow>Passed everywhere ({report.passed.length})</Eyebrow>
          <ul className="ld-chips mt-3">
            {report.passed.map((p) => (
              <li key={p} className="ld-tag ld-tag--quiet">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
