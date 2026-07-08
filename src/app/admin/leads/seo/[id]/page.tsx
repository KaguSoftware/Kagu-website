import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SeoStrategyPage } from "@/lib/supabase/database.types";
import { EmptyState, Eyebrow } from "../../../_components/ui";
import { JobStatusBadge } from "../../_components/JobStatusBadge";
import { AuditReportView } from "../../_components/AuditReportView";
import { CopyPromptButton } from "../../_components/CopyPromptButton";
import { VerifyPagesButton } from "../../_components/VerifyPagesButton";
import {
  SEO_INTENT_CLASSES,
  SEO_STRATEGY_WINNABILITY_CLASSES,
  seoAuditScoreClass,
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

/* Numbered section heading — mirrors the §-numbering inside the master
   prompt so the on-screen report and the pasted brief cross-reference. */
function SectionHeading({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <Eyebrow>
      <span className="text-mint-deep">{index}</span>
      <span className="ml-3">{children}</span>
    </Eyebrow>
  );
}

function Stat({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
        {label}
      </dt>
      <dd className={`mt-1 font-mono text-sm ${tone}`}>{value}</dd>
    </div>
  );
}

function PageCard({
  page,
  index,
  check,
}: {
  page: SeoStrategyPage;
  index: number;
  check?: { ok: boolean; status: number | null };
}) {
  return (
    <div className="border border-neutral p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-slate-ink">4.{index + 1}</span>
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
        {check ? (
          <Badge
            label={check.ok ? "live" : check.status ? `missing (${check.status})` : "unreachable"}
            classes={check.ok ? "border-[#3fb27f] text-[#3fb27f]" : "border-[#e5594e] text-[#e5594e]"}
          />
        ) : null}
        <span className="ml-auto text-xs text-slate-ink">
          {page.pageType} · {page.language}
        </span>
      </div>

      <h3 className="mt-4 text-base text-ink">{page.headKeyword}</h3>

      {(page.title || page.metaDescription) && (
        <dl className="mt-2 flex flex-col gap-1">
          {page.title ? (
            <div className="flex gap-2 text-xs">
              <dt className="shrink-0 font-mono uppercase tracking-[0.14em] text-slate-ink">
                Title
              </dt>
              <dd className="text-slate-ink">{page.title}</dd>
            </div>
          ) : null}
          {page.metaDescription ? (
            <div className="flex gap-2 text-xs">
              <dt className="shrink-0 font-mono uppercase tracking-[0.14em] text-slate-ink">
                Meta
              </dt>
              <dd className="max-w-prose text-slate-ink">{page.metaDescription}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {page.tailQueries.length > 0 && (
        <div className="mt-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
            Cluster queries
          </span>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
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
        <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
          <span className="font-mono uppercase tracking-[0.14em]">Cover · </span>
          {page.entities.join("; ")}
        </p>
      )}

      {page.faq.length > 0 && (
        <div className="mt-4 border-t border-neutral pt-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
            FAQ
          </span>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {page.faq.map((f) => (
              <li key={f.question} className="text-xs leading-relaxed">
                <span className="text-ink">{f.question}</span>
                {f.answerGuidance ? (
                  <span className="text-slate-ink"> — {f.answerGuidance}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
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
    <div className="flex flex-col gap-12">
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
        {job.error ? (
          <p className="mt-3 max-w-prose text-xs text-[#e5594e]">{job.error}</p>
        ) : null}
        {report ? (
          <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
            <Stat label="Pages planned" value={job.pages_planned} />
            <Stat label="Verified demand" value={job.demand_queries} />
            <Stat
              label="Audit"
              value={job.audit_score !== null ? `${job.audit_score}/100` : "skipped"}
              tone={
                job.audit_score !== null
                  ? seoAuditScoreClass(job.audit_score)
                  : "text-slate-ink"
              }
            />
            <Stat
              label="Finished"
              value={
                job.finished_at
                  ? new Date(job.finished_at).toLocaleString("en-GB")
                  : "—"
              }
              tone="text-slate-ink"
            />
          </dl>
        ) : null}
      </div>

      {!report || !u ? (
        <EmptyState>
          {job.status === "pending" || job.status === "running"
            ? "The report appears here once the worker finishes this job."
            : "No report was produced for this job."}
        </EmptyState>
      ) : (
        <>
          {/* The deliverable first: the master prompt as one panel with its
              actions in the toolbar, the text itself tucked behind scroll. */}
          <div className="border border-neutral">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral bg-mint-pale px-4 py-3">
              <div>
                <Eyebrow>Master prompt</Eyebrow>
                <p className="mt-0.5 text-xs text-slate-ink">
                  Paste into a coding agent ·{" "}
                  {report.prompt.length.toLocaleString("en-GB")} characters
                </p>
              </div>
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
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-slate-ink">
              {report.prompt}
            </pre>
          </div>

          {/* What the tool understood the business to be. */}
          <section>
            <SectionHeading index="01">Understanding</SectionHeading>
            <div className="mt-4 border border-neutral p-5">
              {u.coreValueProposition ? (
                <p className="max-w-prose text-base leading-relaxed text-ink">
                  {u.coreValueProposition}
                </p>
              ) : null}
              <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                <Stat label="Brand" value={u.brand} />
                <Stat
                  label="Sector"
                  value={u.subSector ? `${u.sector} / ${u.subSector}` : u.sector}
                />
                <Stat label="Languages" value={u.languages.join(" + ")} />
                <Stat label="Market" value={u.locations} />
              </dl>
              {u.offerings.length > 0 && (
                <div className="mt-5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
                    Offers
                  </span>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {u.offerings.map((o) => (
                      <li
                        key={o}
                        className="border border-neutral px-2 py-0.5 text-xs text-ink"
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {u.problemsSolved.length > 0 && (
                <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
                  <span className="font-mono uppercase tracking-[0.14em]">Solves · </span>
                  {u.problemsSolved.join("; ")}
                </p>
              )}
              {job.context ? (
                <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
                  <span className="font-mono uppercase tracking-[0.14em]">
                    Owner context ·{" "}
                  </span>
                  {job.context}
                </p>
              ) : null}
            </div>
          </section>

          {/* SERP + demand evidence. */}
          <section>
            <SectionHeading index="02">
              Search landscape ({report.searchesChecked.length} checked)
            </SectionHeading>
            <div className="mt-4 overflow-x-auto border border-neutral">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral">
                    <th className="eyebrow px-4 py-3 font-normal">Search</th>
                    <th className="eyebrow px-4 py-3 font-normal">Intent</th>
                    <th className="eyebrow px-4 py-3 font-normal">Our position</th>
                    <th className="eyebrow px-4 py-3 font-normal">Typed variants</th>
                  </tr>
                </thead>
                <tbody>
                  {report.searchesChecked.map((e) => (
                    <tr key={e.query} className="border-b border-neutral last:border-0">
                      <td className="px-4 py-3 text-ink">{e.query}</td>
                      <td className="px-4 py-3">
                        <Badge
                          label={e.intent}
                          classes={
                            SEO_INTENT_CLASSES[e.intent] ?? "border-neutral text-slate-ink"
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        {e.error ? (
                          <span className="text-xs text-[#d9a13b]">check failed</span>
                        ) : e.siteRank ? (
                          <span className="font-mono text-[#3fb27f]">#{e.siteRank}</span>
                        ) : (
                          <span className="text-xs text-slate-ink">absent</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-ink">
                        {e.suggestions.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-ink">
              {report.gsc === null
                ? "Search Console: not connected (worker/README.md shows the setup)."
                : report.gsc.length === 0
                  ? "Search Console: connected — no impressions recorded yet (starting from zero)."
                  : `Search Console: ${report.gsc.length} real queries with impressions.`}
            </p>
          </section>

          {/* The market — competitors deep-crawled from the money SERPs plus
              dedicated provider-finding scans. */}
          <section>
            <SectionHeading index="03">
              Market ({report.competitors?.length ?? 0} competitors crawled)
            </SectionHeading>
            {report.market ? (
              <div className="mt-4 border border-neutral p-5">
                {report.market.summary ? (
                  <p className="max-w-prose text-base leading-relaxed text-ink">
                    {report.market.summary}
                  </p>
                ) : null}
                {report.market.tableStakes.length > 0 && (
                  <div className="mt-4">
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
                      Table stakes
                    </span>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {report.market.tableStakes.map((t) => (
                        <li
                          key={t}
                          className="border border-neutral px-2 py-0.5 text-xs text-ink"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.market.standardAngles.length > 0 && (
                  <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
                    <span className="font-mono uppercase tracking-[0.14em]">
                      Standard angles ·{" "}
                    </span>
                    {report.market.standardAngles.join("; ")}
                  </p>
                )}
                {report.market.openings.length > 0 && (
                  <p className="mt-3 bg-mint-pale px-3 py-2 text-xs leading-relaxed text-ink">
                    <span className="font-mono uppercase tracking-[0.14em] text-mint-deep">
                      Openings ·{" "}
                    </span>
                    {report.market.openings.join("; ")}
                  </p>
                )}
                {report.market.scanQueries.length > 0 && (
                  <p className="mt-3 text-xs text-slate-ink">
                    <span className="font-mono uppercase tracking-[0.14em]">
                      Scanned ·{" "}
                    </span>
                    {report.market.scanQueries.map((q) => `“${q}”`).join(", ")}
                  </p>
                )}
              </div>
            ) : null}
            {report.competitors?.length ? (
              <div className="mt-4 flex flex-col gap-4">
                {report.competitors.map((c) => (
                  <div key={c.domain} className="border border-neutral p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={`https://${c.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-ink underline-offset-4 hover:underline"
                      >
                        {c.domain}
                      </a>
                      <span className="font-mono text-xs text-slate-ink">
                        best rank #{c.bestRank}
                      </span>
                      <span className="ml-auto text-xs text-slate-ink">
                        {c.pagesRead} page{c.pagesRead === 1 ? "" : "s"} read
                      </span>
                    </div>
                    {c.summary ? (
                      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink">
                        {c.summary}
                      </p>
                    ) : null}
                    {c.appearsFor.length > 0 && (
                      <p className="mt-2 text-xs text-slate-ink">
                        <span className="font-mono uppercase tracking-[0.14em]">
                          Found via ·{" "}
                        </span>
                        {c.appearsFor.map((q) => `“${q}”`).join(", ")}
                      </p>
                    )}
                    {c.keywordsTargeted.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
                          Targets
                        </span>
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {c.keywordsTargeted.map((k) => (
                            <li
                              key={k}
                              className="border border-neutral px-2 py-0.5 text-xs text-ink"
                            >
                              {k}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.angles.length > 0 && (
                      <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
                        <span className="font-mono uppercase tracking-[0.14em]">
                          Leads with ·{" "}
                        </span>
                        {c.angles.join("; ")}
                      </p>
                    )}
                    {c.gaps.length > 0 && (
                      <p className="mt-3 bg-mint-pale px-3 py-2 text-xs leading-relaxed text-ink">
                        <span className="font-mono uppercase tracking-[0.14em] text-mint-deep">
                          Gaps ·{" "}
                        </span>
                        {c.gaps.join("; ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 max-w-prose text-xs leading-relaxed text-slate-ink">
                {report.competitors
                  ? "No direct competitors surfaced across the money SERPs and market scans for this run."
                  : "This report predates the market deep-dive — re-run the job to get crawled competitor profiles and a market overview."}
              </p>
            )}
          </section>

          {/* Head keywords with winnability. */}
          <section>
            <SectionHeading index="04">
              Head keywords ({report.headKeywords.length})
            </SectionHeading>
            <div className="mt-4 overflow-x-auto border border-neutral">
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
                      <td className="max-w-md px-4 py-3 text-xs leading-relaxed text-slate-ink">
                        {h.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* The page plan — numbered 4.n to match §4 of the prompt. */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeading index="05">
                Page plan ({report.pages.length})
              </SectionHeading>
              <div className="flex items-center gap-3">
                {report.pageCheck ? (
                  <span className="text-xs text-slate-ink">
                    {report.pageCheck.results.filter((r) => r.ok).length}/
                    {report.pageCheck.results.length} live ·{" "}
                    {new Date(report.pageCheck.checkedAt).toLocaleString("en-GB")}
                  </span>
                ) : null}
                <VerifyPagesButton jobId={job.id} />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              {report.pages.map((page, i) => (
                <PageCard
                  key={page.slug}
                  page={page}
                  index={i}
                  check={report.pageCheck?.results.find((r) => r.slug === page.slug)}
                />
              ))}
            </div>
          </section>

          {/* Embedded technical audit. */}
          <section>
            <SectionHeading index="06">Technical audit</SectionHeading>
            {report.audit ? (
              <div className="mt-6 flex flex-col gap-10">
                <AuditReportView report={report.audit} />
              </div>
            ) : (
              <p className="mt-4 max-w-prose text-xs leading-relaxed text-slate-ink">
                The technical audit was skipped for this run — the prompt tells
                the agent to run it itself (via the worker CLI) as part of the
                brief.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
