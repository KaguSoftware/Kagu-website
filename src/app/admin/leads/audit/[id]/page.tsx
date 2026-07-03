import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SeoAuditFinding } from "@/lib/supabase/database.types";
import { Eyebrow } from "../../../_components/ui";
import { JobStatusBadge } from "../../_components/JobStatusBadge";
import { ProgressBar } from "../../_components/ProgressBar";
import {
  SEO_AUDIT_SEVERITY_CLASSES,
  seoAuditScoreClass,
} from "../../_lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_audit_jobs")
    .select("url")
    .eq("id", (await params).id)
    .maybeSingle();
  return { title: data ? `Audit — ${data.url}` : "Site audit" };
}

const displayUrl = (url: string) =>
  url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

const sec = (ms: number | null) => (ms ? `${(ms / 1000).toFixed(1)}s` : "—");
const mb = (bytes: number | null) =>
  bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "—";

function FindingCard({ finding }: { finding: SeoAuditFinding }) {
  return (
    <div className="border border-neutral p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${
            SEO_AUDIT_SEVERITY_CLASSES[finding.severity] ??
            "border-neutral text-slate-ink"
          }`}
        >
          {finding.severity}
        </span>
        <span className="text-sm text-ink">{finding.label}</span>
      </div>
      <p className="mt-2 text-sm text-ink">{finding.issue}</p>
      {finding.why ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-ink">
          <span className="font-mono uppercase tracking-[0.14em]">Why · </span>
          {finding.why}
        </p>
      ) : null}
      {finding.specifics.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5">
          {finding.specifics.slice(0, 8).map((s, i) => (
            <li
              key={i}
              className="truncate font-mono text-xs text-slate-ink"
              title={s}
            >
              {s}
            </li>
          ))}
          {finding.specifics.length > 8 && (
            <li className="font-mono text-xs text-slate-ink">
              …and {finding.specifics.length - 8} more
            </li>
          )}
        </ul>
      )}
      {finding.pages.length > 0 && (
        <p className="mt-2 text-xs text-slate-ink">
          <span className="font-mono uppercase tracking-[0.14em]">Pages · </span>
          {finding.pages.slice(0, 6).join(", ")}
          {finding.pages.length > 6 ? ` +${finding.pages.length - 6} more` : ""}
        </p>
      )}
      <p className="mt-2 border-l-2 border-mint-deep pl-3 text-xs leading-relaxed text-ink">
        <span className="font-mono uppercase tracking-[0.14em] text-mint-deep">
          Fix ·{" "}
        </span>
        {finding.fix}
      </p>
    </div>
  );
}

export default async function AuditJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("seo_audit_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();
  const report = job.report;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/leads/audit"
          className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 hover:text-ink hover:underline"
        >
          ← All audits
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="display text-2xl text-ink">{displayUrl(job.url)}</h2>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="mt-2 text-sm text-slate-ink">
          {job.pages_audited} pages audited (cap {job.max_pages}) ·{" "}
          {job.issues_found} issues · mobile-rendered, throttled 4G
          {job.finished_at
            ? ` · ${new Date(job.finished_at).toLocaleString("en-GB")}`
            : ""}
        </p>
        {job.error ? (
          <p className="mt-2 max-w-prose text-xs text-[#e5594e]">{job.error}</p>
        ) : null}
      </div>

      {!report ? (
        <p className="border border-dashed border-neutral p-8 text-center text-sm text-slate-ink">
          {job.status === "pending" || job.status === "running"
            ? "The report appears here once the worker finishes this audit."
            : "No report was produced for this audit."}
        </p>
      ) : (
        <>
          {/* Overall + per-category scores. */}
          <div className="flex flex-wrap items-start gap-10">
            <div>
              <Eyebrow>Overall score</Eyebrow>
              <p
                className={`display mt-2 text-5xl ${seoAuditScoreClass(report.score)}`}
              >
                {report.score}
                <span className="text-xl text-slate-ink">/100</span>
              </p>
            </div>
            <div className="grid min-w-64 flex-1 grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
              {report.categories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-slate-ink">
                    {cat.label}
                  </span>
                  {cat.score === null ? (
                    <span className="text-xs text-slate-ink">n/a</span>
                  ) : (
                    <>
                      <ProgressBar value={cat.score} />
                      <span
                        className={`w-8 text-right font-mono text-xs ${seoAuditScoreClass(cat.score)}`}
                      >
                        {cat.score}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Per-page scores + lab metrics. */}
          <div>
            <Eyebrow>Pages</Eyebrow>
            <div className="mt-3 overflow-x-auto border border-neutral">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral">
                    <th className="eyebrow px-4 py-3 font-normal">Score</th>
                    <th className="eyebrow px-4 py-3 font-normal">LCP</th>
                    <th className="eyebrow px-4 py-3 font-normal">CLS</th>
                    <th className="eyebrow px-4 py-3 font-normal">Weight</th>
                    <th className="eyebrow px-4 py-3 font-normal">Requests</th>
                    <th className="eyebrow px-4 py-3 font-normal">Page</th>
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
                      <tr
                        key={page.finalUrl}
                        className="border-b border-neutral last:border-0"
                      >
                        <td
                          className={`px-4 py-3 font-mono ${seoAuditScoreClass(page.score)}`}
                        >
                          {page.score}
                        </td>
                        <td className="px-4 py-3 text-slate-ink">
                          {sec(page.metrics.lcpMs)}
                        </td>
                        <td className="px-4 py-3 text-slate-ink">
                          {page.metrics.cls ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-ink">
                          {mb(page.metrics.pageWeightBytes)}
                        </td>
                        <td className="px-4 py-3 text-slate-ink">
                          {page.metrics.requestCount ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={page.finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink underline-offset-4 hover:underline"
                          >
                            {path}
                          </a>
                          {page.error ? (
                            <span className="ml-2 text-xs text-[#e5594e]">
                              fetch failed
                            </span>
                          ) : !page.renderOk ? (
                            <span className="ml-2 text-xs text-[#d9a13b]">
                              static only
                            </span>
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
              <p className="mt-3 border border-dashed border-neutral p-8 text-center text-sm text-slate-ink">
                Clean audit — nothing to fix.
              </p>
            )}
          </div>

          {/* Checks that passed on every page they applied to. */}
          {report.passed.length > 0 && (
            <div>
              <Eyebrow>Passed everywhere ({report.passed.length})</Eyebrow>
              <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
                {report.passed.join(" · ")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
