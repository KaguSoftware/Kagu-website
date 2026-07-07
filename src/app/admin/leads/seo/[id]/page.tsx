import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SeoStrategyPage } from "@/lib/supabase/database.types";
import { Eyebrow } from "../../../_components/ui";
import { JobStatusBadge } from "../../_components/JobStatusBadge";
import { AuditReportView } from "../../_components/AuditReportView";
import { CopyPromptButton } from "../../_components/CopyPromptButton";
import {
  SEO_INTENT_CLASSES,
  SEO_STRATEGY_WINNABILITY_CLASSES,
} from "../../_lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_strategy_jobs")
    .select("url")
    .eq("id", (await params).id)
    .maybeSingle();
  return { title: data ? `SEO — ${data.url}` : "SEO" };
}

const displayUrl = (url: string) =>
  url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

function Badge({ label, classes }: { label: string; classes: string }) {
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${classes}`}
    >
      {label}
    </span>
  );
}

function PageCard({ page }: { page: SeoStrategyPage }) {
  return (
    <div className="border border-neutral p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          label={page.action}
          classes={
            page.action === "create"
              ? "border-mint-deep text-mint-deep"
              : "border-[#d9a13b] text-[#d9a13b]"
          }
        />
        <span className="font-mono text-sm text-ink">{page.slug}</span>
        <Badge
          label={page.intent}
          classes={SEO_INTENT_CLASSES[page.intent] ?? "border-neutral text-slate-ink"}
        />
        <span className="text-xs text-slate-ink">
          {page.pageType} · {page.language}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink">
        <span className="font-mono uppercase tracking-[0.14em] text-slate-ink">
          Head ·{" "}
        </span>
        {page.headKeyword}
      </p>
      {page.title ? (
        <p className="mt-1 text-xs text-slate-ink">
          <span className="font-mono uppercase tracking-[0.14em]">Title · </span>
          {page.title}
        </p>
      ) : null}
      {page.metaDescription ? (
        <p className="mt-1 max-w-prose text-xs text-slate-ink">
          <span className="font-mono uppercase tracking-[0.14em]">Meta · </span>
          {page.metaDescription}
        </p>
      ) : null}
      {page.tailQueries.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
            Cluster queries
          </span>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {page.tailQueries.map((q) => (
              <li
                key={q}
                className="border border-neutral px-2 py-0.5 text-xs text-ink"
              >
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
      {page.entities.length > 0 && (
        <p className="mt-2 text-xs text-slate-ink">
          <span className="font-mono uppercase tracking-[0.14em]">Cover · </span>
          {page.entities.join("; ")}
        </p>
      )}
      {page.faq.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {page.faq.map((f) => (
            <li key={f.question} className="text-xs leading-relaxed text-slate-ink">
              <span className="text-ink">Q: {f.question}</span>
              {f.answerGuidance ? ` → ${f.answerGuidance}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function SeoJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("seo_strategy_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();
  const report = job.report;
  const u = report?.understanding;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/leads/seo"
          className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 hover:text-ink hover:underline"
        >
          ← All SEO runs
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="display text-2xl text-ink">{displayUrl(job.url)}</h2>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="mt-2 text-sm text-slate-ink">
          {job.pages_planned} pages planned · {job.demand_queries} verified
          demand queries ·{" "}
          {job.audit_score !== null ? `audit ${job.audit_score}/100` : "audit skipped"}
          {job.finished_at
            ? ` · ${new Date(job.finished_at).toLocaleString("en-GB")}`
            : ""}
        </p>
        {job.error ? (
          <p className="mt-2 max-w-prose text-xs text-[#e5594e]">{job.error}</p>
        ) : null}
      </div>

      {!report || !u ? (
        <p className="border border-dashed border-neutral p-8 text-center text-sm text-slate-ink">
          {job.status === "pending" || job.status === "running"
            ? "The report appears here once the worker finishes this job."
            : "No report was produced for this job."}
        </p>
      ) : (
        <>
          {/* The deliverable first: the master prompt. */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Eyebrow>Master prompt — paste into a coding agent</Eyebrow>
              <div className="flex items-center gap-2">
                <CopyPromptButton prompt={report.prompt} />
                <a
                  href={`data:text/markdown;charset=utf-8,${encodeURIComponent(report.prompt)}`}
                  download={`seo-strategy-${report.host}.md`}
                  className="border border-neutral px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Download .md
                </a>
              </div>
            </div>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap border border-neutral bg-paper p-4 font-mono text-xs leading-relaxed text-slate-ink">
              {report.prompt}
            </pre>
          </div>

          {/* What the tool understood the business to be. */}
          <div>
            <Eyebrow>Understanding</Eyebrow>
            <div className="mt-3 border border-neutral p-4 text-sm text-ink">
              <p>
                <span className="text-slate-ink">{u.brand}</span> — {u.sector}
                {u.subSector ? ` / ${u.subSector}` : ""} · {u.languages.join("+")} ·{" "}
                {u.locations}
              </p>
              {u.coreValueProposition ? (
                <p className="mt-2">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-mint-deep">
                    Core ·{" "}
                  </span>
                  {u.coreValueProposition}
                </p>
              ) : null}
              {u.offerings.length > 0 && (
                <p className="mt-2 text-xs text-slate-ink">
                  <span className="font-mono uppercase tracking-[0.14em]">Offers · </span>
                  {u.offerings.join("; ")}
                </p>
              )}
              {u.problemsSolved.length > 0 && (
                <p className="mt-1 text-xs text-slate-ink">
                  <span className="font-mono uppercase tracking-[0.14em]">Solves · </span>
                  {u.problemsSolved.join("; ")}
                </p>
              )}
              {job.context ? (
                <p className="mt-2 text-xs text-slate-ink">
                  <span className="font-mono uppercase tracking-[0.14em]">
                    Owner context ·{" "}
                  </span>
                  {job.context}
                </p>
              ) : null}
            </div>
          </div>

          {/* SERP + demand evidence. */}
          <div>
            <Eyebrow>Search landscape ({report.searchesChecked.length} checked)</Eyebrow>
            <div className="mt-3 flex flex-col gap-2">
              {report.searchesChecked.map((e) => (
                <div
                  key={e.query}
                  className="flex flex-wrap items-center gap-2 border border-neutral px-4 py-2 text-sm"
                >
                  <Badge
                    label={e.intent}
                    classes={SEO_INTENT_CLASSES[e.intent] ?? "border-neutral text-slate-ink"}
                  />
                  <span className="text-ink">&ldquo;{e.query}&rdquo;</span>
                  <span className="text-xs text-slate-ink">
                    {e.error
                      ? "SERP check failed"
                      : e.siteRank
                        ? `we rank #${e.siteRank}`
                        : "not in top results"}
                    {" · "}
                    {e.suggestions.length} typed variants
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-ink">
              {report.gsc === null
                ? "Search Console: not connected (worker/README.md shows the setup)."
                : report.gsc.length === 0
                  ? "Search Console: connected — no impressions recorded yet (starting from zero)."
                  : `Search Console: ${report.gsc.length} real queries with impressions.`}
            </p>
          </div>

          {/* Head keywords with winnability. */}
          <div>
            <Eyebrow>Head keywords ({report.headKeywords.length})</Eyebrow>
            <div className="mt-3 overflow-x-auto border border-neutral">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral">
                    <th className="eyebrow px-4 py-3 font-normal">Keyword</th>
                    <th className="eyebrow px-4 py-3 font-normal">Intent</th>
                    <th className="eyebrow px-4 py-3 font-normal">Winnability</th>
                    <th className="eyebrow px-4 py-3 font-normal">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {report.headKeywords.map((h) => (
                    <tr key={h.keyword} className="border-b border-neutral last:border-0">
                      <td className="px-4 py-3 text-ink">{h.keyword}</td>
                      <td className="px-4 py-3">
                        <Badge
                          label={h.intent}
                          classes={
                            SEO_INTENT_CLASSES[h.intent] ?? "border-neutral text-slate-ink"
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={h.winnability}
                          classes={
                            SEO_STRATEGY_WINNABILITY_CLASSES[h.winnability] ??
                            "border-neutral text-slate-ink"
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-ink">{h.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* The page plan. */}
          <div>
            <Eyebrow>Page plan ({report.pages.length})</Eyebrow>
            <div className="mt-3 flex flex-col gap-3">
              {report.pages.map((page) => (
                <PageCard key={page.slug} page={page} />
              ))}
            </div>
          </div>

          {/* Embedded technical audit. */}
          {report.audit ? (
            <div className="flex flex-col gap-10 border-t border-neutral pt-8">
              <Eyebrow>Embedded technical audit</Eyebrow>
              <AuditReportView report={report.audit} />
            </div>
          ) : (
            <p className="text-xs text-slate-ink">
              The technical audit was skipped for this run — the prompt tells
              the agent to run it itself (via the worker CLI) as part of the
              brief.
            </p>
          )}
        </>
      )}
    </div>
  );
}
