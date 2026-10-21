import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SeoStrategyPage } from "@/lib/supabase/database.types";
import { EmptyState, Eyebrow } from "../../../_components/ui";
import { JobStatusBadge } from "../../_components/JobStatusBadge";
import { AuditReportView } from "../../_components/AuditReportView";
import { CopyPromptButton } from "../../_components/CopyPromptButton";
import { RerunStrategyButton } from "../../_components/RerunStrategyButton";
import { Disclosure } from "../../_components/Disclosure";
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
    <span className={`ld-pill ${classes}`}>{label}</span>
  );
}

/* Numbered section heading — mirrors the §-numbering inside the master
   prompt so the on-screen report and the pasted brief cross-reference. */
function SectionHeading({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <h2 className="ld-sec">
      <span className="ld-sec__n">{index}</span>
      <span>{children}</span>
    </h2>
  );
}

function Stat({
  label,
  value,
  tone = "ld-t-ink",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={tone}>{value}</dd>
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
    <div className="ld-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="ld-small ld-num">4.{index + 1}</span>
        <Badge
          label={page.action}
          classes={
            page.action === "create"
              ? "ld-pill--info"
              : "ld-pill--warn"
          }
        />
        <span className="ld-code text-ink">{page.slug}</span>
        <Badge
          label={page.intent}
          classes={SEO_INTENT_CLASSES[page.intent] ?? "ld-pill--neutral"}
        />
        {check ? (
          <Badge
            label={check.ok ? "live" : check.status ? `missing (${check.status})` : "unreachable"}
            classes={check.ok ? "ld-pill--ok" : "ld-pill--bad"}
          />
        ) : null}
        <span className="ld-small ml-auto">
          {page.pageType} · {page.language}
        </span>
      </div>

      <h3 className="mt-4 font-[family-name:var(--sans)] text-[17px] font-medium tracking-normal text-ink">{page.headKeyword}</h3>

      {(page.title || page.metaDescription) && (
        <dl className="mt-2 flex flex-col gap-1">
          {page.title ? (
            <div className="flex gap-3 text-[13px]">
              <dt className="ld-lbl shrink-0">
                Title
              </dt>
              <dd className="ld-t-muted">{page.title}</dd>
            </div>
          ) : null}
          {page.metaDescription ? (
            <div className="flex gap-3 text-[13px]">
              <dt className="ld-lbl shrink-0">
                Meta
              </dt>
              <dd className="ld-t-muted max-w-prose">{page.metaDescription}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {page.tailQueries.length > 0 && (
        <div className="mt-4">
          <span className="ld-lbl">
            Cluster queries
          </span>
          <ul className="ld-chips mt-2">
            {page.tailQueries.map((q) => (
              <li key={q} className="ld-tag">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {page.entities.length > 0 && (
        <p className="ld-small mt-3 max-w-prose">
          <span className="ld-inline-lbl">Cover · </span>
          {page.entities.join("; ")}
        </p>
      )}

      {page.faq.length > 0 && (
        <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
          <span className="ld-lbl">
            FAQ
          </span>
          <ul className="mt-2 flex flex-col gap-2">
            {page.faq.map((f) => (
              <li key={f.question} className="text-[13px] leading-relaxed">
                <span className="text-ink">{f.question}</span>
                {f.answerGuidance ? (
                  <span className="ld-t-muted"> — {f.answerGuidance}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const GOOD = "ld-pill--ok";
const BAD = "ld-pill--bad";
const NEUTRAL = "ld-pill--neutral";

/* true = green, false = red, null = neutral "—". */
function TriBadge({
  value,
  yes,
  no,
  none = "—",
}: {
  value: boolean | null;
  yes: string;
  no: string;
  none?: string;
}) {
  if (value === null) return <Badge label={none} classes={NEUTRAL} />;
  return <Badge label={value ? yes : no} classes={value ? GOOD : BAD} />;
}

/* Lower position = better, so an improvement is previous minus latest. */
function PositionCell({
  latest,
  previous,
}: {
  latest: number | null;
  previous: number | null;
}) {
  if (latest === null) return <span className="ld-small">—</span>;
  const diff = previous === null ? 0 : previous - latest;
  return (
    <span className="ld-num text-xs font-medium text-ink">
      #{latest.toFixed(1)}
      {diff >= 0.05 ? (
        <span className="ml-2 ld-t-ok">▲ {diff.toFixed(1)}</span>
      ) : diff <= -0.05 ? (
        <span className="ml-2 ld-t-bad">▼ {(-diff).toFixed(1)}</span>
      ) : null}
    </span>
  );
}

const toNum = (v: number | string | null | undefined) =>
  v === null || v === undefined ? null : Number(v);

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

  // Plan tracking tables come from supabase/seo_plan_module.sql — until that
  // module is applied these queries error and the section shows the setup hint.
  const { data: checkRows, error: checksError } = await supabase
    .from("seo_plan_checks")
    .select("*")
    .eq("strategy_job_id", id)
    .order("checked_at", { ascending: false })
    .limit(500);
  const { data: followupRows, error: followupsError } = await supabase
    .from("seo_strategy_followups")
    .select("*")
    .eq("strategy_job_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  const checks = checkRows ?? [];
  const followups = followupRows ?? [];

  // Newest-first rows: the first hit per slug is the latest check, the second
  // the previous one (for the position delta).
  const checksBySlug = new Map<string, typeof checks>();
  for (const c of checks) {
    const list = checksBySlug.get(c.slug);
    if (list) list.push(c);
    else checksBySlug.set(c.slug, [c]);
  }
  const latestChecks = report
    ? report.pages.flatMap((p) => {
        const c = checksBySlug.get(p.slug)?.[0];
        return c ? [c] : [];
      })
    : [];
  const lastCheckedAt = checks[0]?.checked_at ?? null;

  return (
    <div className="flex flex-col gap-14">
      <div>
        <Link
          href="/admin/leads/seo"
          className="ld-back"
        >
          ← All SEO runs
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <h2 className="ld-title">{displayUrl(job.url)}</h2>
          <JobStatusBadge status={job.status} />
          {job.status !== "pending" && job.status !== "running" ? (
            <RerunStrategyButton jobId={job.id} />
          ) : null}
        </div>
        {job.error ? (
          <p className="ld-small ld-t-bad mt-3 max-w-prose">{job.error}</p>
        ) : null}
        {report ? (
          <dl className="ld-kv ld-kv--hero mt-6">
            <Stat label="Pages planned" value={job.pages_planned} />
            <Stat label="Verified demand" value={job.demand_queries} />
            <Stat
              label="Audit"
              value={job.audit_score !== null ? `${job.audit_score}/100` : "skipped"}
              tone={
                job.audit_score !== null
                  ? seoAuditScoreClass(job.audit_score)
                  : "ld-t-muted"
              }
            />
            <Stat
              label="Finished"
              value={
                job.finished_at
                  ? new Date(job.finished_at).toLocaleString("en-GB")
                  : "—"
              }
              tone="ld-t-muted"
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
          <div className="ld-card ld-card--flush">
            <div className="ld-prompt__bar">
              <div>
                <Eyebrow>Master prompt</Eyebrow>
                <p className="ld-small mt-1">
                  Paste into a coding agent ·{" "}
                  {report.prompt.length.toLocaleString("en-GB")} characters
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CopyPromptButton prompt={report.prompt} />
                <a
                  href={`data:text/markdown;charset=utf-8,${encodeURIComponent(report.prompt)}`}
                  download={`seo-strategy-${report.host}.md`}
                  className="adm-btn adm-btn--ghost ld-sm"
                >
                  Download .md
                </a>
              </div>
            </div>
            <pre className="ld-prompt__pre">
              {report.prompt}
            </pre>
          </div>

          {/* What the tool understood the business to be. */}
          <section>
            <SectionHeading index="01">Understanding</SectionHeading>
            <div className="ld-card mt-4">
              {u.coreValueProposition ? (
                <p className="max-w-prose text-[16px] leading-[1.7] text-ink">
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
                  <span className="ld-lbl">
                    Offers
                  </span>
                  <ul className="ld-chips mt-2">
                    {u.offerings.map((o) => (
                      <li key={o} className="ld-tag">
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {u.problemsSolved.length > 0 && (
                <p className="ld-small mt-3 max-w-prose">
                  <span className="ld-inline-lbl">Solves · </span>
                  {u.problemsSolved.join("; ")}
                </p>
              )}
              {job.context ? (
                <p className="ld-small mt-3 max-w-prose">
                  <span className="ld-inline-lbl">
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
            <div className="ld-wrap mt-4">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Search</th>
                    <th>Intent</th>
                    <th>Our position</th>
                    <th>Typed variants</th>
                  </tr>
                </thead>
                <tbody>
                  {report.searchesChecked.map((e) => (
                    <tr key={e.query}>
                      <td>{e.query}</td>
                      <td>
                        <Badge
                          label={e.intent}
                          classes={
                            SEO_INTENT_CLASSES[e.intent] ?? "ld-pill--neutral"
                          }
                        />
                      </td>
                      <td>
                        {e.error ? (
                          <span className="ld-small ld-t-warn">check failed</span>
                        ) : e.siteRank ? (
                          <span className="font-medium ld-t-ok">#{e.siteRank}</span>
                        ) : (
                          <span className="ld-small">absent</span>
                        )}
                      </td>
                      <td className="ld-t-muted">
                        {e.suggestions.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ld-small mt-2">
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
              <div className="ld-card mt-4">
                {report.market.summary ? (
                  <p className="max-w-prose text-[16px] leading-[1.7] text-ink">
                    {report.market.summary}
                  </p>
                ) : null}
                {report.market.tableStakes.length > 0 && (
                  <div className="mt-4">
                    <span className="ld-lbl">
                      Table stakes
                    </span>
                    <ul className="ld-chips mt-2">
                      {report.market.tableStakes.map((t) => (
                        <li key={t} className="ld-tag">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.market.standardAngles.length > 0 && (
                  <p className="ld-small mt-3 max-w-prose">
                    <span className="ld-inline-lbl">
                      Standard angles ·{" "}
                    </span>
                    {report.market.standardAngles.join("; ")}
                  </p>
                )}
                {report.market.openings.length > 0 && (
                  <p className="ld-note mt-3">
                    <span className="ld-inline-lbl ld-t-info">
                      Openings ·{" "}
                    </span>
                    {report.market.openings.join("; ")}
                  </p>
                )}
                {report.market.scanQueries.length > 0 && (
                  <p className="ld-small mt-3">
                    <span className="ld-inline-lbl">
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
                  <div key={c.domain} className="ld-card">
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={`https://${c.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ld-link ld-code"
                      >
                        {c.domain}
                      </a>
                      <span className="ld-small ld-num">
                        best rank #{c.bestRank}
                      </span>
                      <span className="ld-small ml-auto">
                        {c.pagesRead} page{c.pagesRead === 1 ? "" : "s"} read
                      </span>
                    </div>
                    {c.summary ? (
                      <p className="mt-3 max-w-prose text-[14.5px] leading-[1.7] text-ink">
                        {c.summary}
                      </p>
                    ) : null}
                    {c.appearsFor.length > 0 && (
                      <p className="ld-small mt-2">
                        <span className="ld-inline-lbl">
                          Found via ·{" "}
                        </span>
                        {c.appearsFor.map((q) => `“${q}”`).join(", ")}
                      </p>
                    )}
                    {c.keywordsTargeted.length > 0 && (
                      <div className="mt-3">
                        <span className="ld-lbl">
                          Targets
                        </span>
                        <ul className="ld-chips mt-2">
                          {c.keywordsTargeted.map((k) => (
                            <li key={k} className="ld-tag">
                              {k}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.angles.length > 0 && (
                      <p className="ld-small mt-3 max-w-prose">
                        <span className="ld-inline-lbl">
                          Leads with ·{" "}
                        </span>
                        {c.angles.join("; ")}
                      </p>
                    )}
                    {c.gaps.length > 0 && (
                      <p className="ld-note mt-3">
                        <span className="ld-inline-lbl ld-t-info">
                          Gaps ·{" "}
                        </span>
                        {c.gaps.join("; ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="ld-small mt-4 max-w-prose">
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
            <div className="ld-wrap mt-4">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Intent</th>
                    <th>Winnability</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {report.headKeywords.map((h) => (
                    <tr key={h.keyword}>
                      <td>{h.keyword}</td>
                      <td>
                        <Badge
                          label={h.intent}
                          classes={
                            SEO_INTENT_CLASSES[h.intent] ?? "ld-pill--neutral"
                          }
                        />
                      </td>
                      <td>
                        <Badge
                          label={h.winnability}
                          classes={
                            SEO_STRATEGY_WINNABILITY_CLASSES[h.winnability] ??
                            "ld-pill--neutral"
                          }
                        />
                      </td>
                      <td className="ld-small max-w-md">
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
                  <span className="ld-small">
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

          {/* Weekly plan check by the worker: did the planned pages ship, are
              they indexable, and is Search Console moving? */}
          <section>
            <SectionHeading index="06">Plan status</SectionHeading>
            {checksError ? (
              <p className="ld-small mt-4 max-w-prose">
                Not set up yet — run{" "}
                <code className="text-ink">supabase/seo_plan_module.sql</code>{" "}
                once in the Supabase SQL editor. After that, the worker checks
                this plan weekly — shipped, indexable, in the sitemap, title,
                FAQ schema, and Search Console movement — and writes follow-up
                prompts when something needs fixing.
              </p>
            ) : checks.length === 0 ? (
              <p className="ld-small mt-4 max-w-prose">
                No plan check yet — the worker checks the latest finished
                strategy per site weekly while idle.
              </p>
            ) : (
              <>
                <p className="ld-small mt-3">
                  <span className="ld-num font-medium text-ink">
                    {latestChecks.filter((c) => c.shipped).length}/
                    {report.pages.length}
                  </span>{" "}
                  shipped ·{" "}
                  <span className="ld-num font-medium text-ink">
                    {latestChecks.filter((c) => c.indexable === true).length}
                  </span>{" "}
                  indexable · last checked{" "}
                  {lastCheckedAt
                    ? new Date(lastCheckedAt).toLocaleDateString("en-GB")
                    : "—"}
                </p>
                <div className="ld-wrap mt-3">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Page</th>
                        <th>Shipped</th>
                        <th>Indexable</th>
                        <th>Sitemap</th>
                        <th>Title</th>
                        <th>FAQ schema</th>
                        <th>Impressions 7d</th>
                        <th>Avg position</th>
                        <th>Issues</th>
                        <th>Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.pages.map((page) => {
                        const [c, prev] = checksBySlug.get(page.slug) ?? [];
                        const pageCell = (
                          <td>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="ld-code text-ink">{page.slug}</span>
                              <Badge
                                label={page.action}
                                classes={
                                  page.action === "create"
                                    ? "ld-pill--info"
                                    : "ld-pill--warn"
                                }
                              />
                            </div>
                          </td>
                        );
                        if (!c) {
                          return (
                            <tr key={page.slug}>
                              {pageCell}
                              <td colSpan={9} className="ld-small">
                                not checked yet
                              </td>
                            </tr>
                          );
                        }
                        const imp = c.impressions_7d;
                        const base = c.baseline_impressions_7d;
                        const pct =
                          imp !== null && base !== null && base > 0
                            ? Math.round(((imp - base) / base) * 100)
                            : null;
                        return (
                          <tr key={page.slug}>
                            {pageCell}
                            <td>
                              <Badge
                                label={
                                  c.shipped
                                    ? "live ✓"
                                    : c.http_status
                                      ? `missing (${c.http_status})`
                                      : "unreachable"
                                }
                                classes={c.shipped ? GOOD : BAD}
                              />
                            </td>
                            <td>
                              <TriBadge value={c.indexable} yes="yes" no="no" />
                            </td>
                            <td>
                              <TriBadge value={c.in_sitemap} yes="yes" no="no" none="n/a" />
                            </td>
                            <td>
                              <TriBadge value={c.title_has_head} yes="ok" no="no head kw" />
                            </td>
                            <td>
                              {c.has_faq_schema === null ? (
                                <span className="ld-small">—</span>
                              ) : (
                                <TriBadge value={c.has_faq_schema} yes="yes" no="missing" />
                              )}
                            </td>
                            <td className="ld-w">
                              {imp === null ? (
                                <span className="ld-small">no GSC</span>
                              ) : (
                                <>
                                  <span className="text-ink">
                                    {imp} / {base ?? "—"}
                                  </span>
                                  {pct !== null && pct !== 0 ? (
                                    <span
                                      className={`ml-2 ${pct > 0 ? "ld-t-ok" : "ld-t-bad"}`}
                                    >
                                      {pct > 0 ? `▲ +${pct}%` : `▼ ${pct}%`}
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </td>
                            <td>
                              <PositionCell
                                latest={toNum(c.avg_position)}
                                previous={toNum(prev?.avg_position)}
                              />
                            </td>
                            <td className="ld-small">
                              {c.audit_issues ? c.audit_issues.length : "—"}
                            </td>
                            <td className="ld-small ld-w">
                              {new Date(c.checked_at).toLocaleDateString("en-GB")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Prompts the worker writes when a plan check finds something
              actionable — newest open, older collapsed. */}
          <section>
            <SectionHeading index="07">
              Follow-up prompts{followupsError ? "" : ` (${followups.length})`}
            </SectionHeading>
            {followupsError ? (
              <p className="ld-small mt-4 max-w-prose">
                Needs <code className="text-ink">supabase/seo_plan_module.sql</code>{" "}
                (see Plan status above).
              </p>
            ) : followups.length === 0 ? (
              <p className="ld-small mt-4 max-w-prose">
                No follow-ups yet — one is written after a plan check finds
                something actionable (and only when the findings change).
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {followups.map((f, i) => {
                  const s = f.summary;
                  const day = f.created_at.slice(0, 10);
                  const toolbar = (
                    <div className="ld-prompt__bar">
                      <div>
                        <Eyebrow>
                          Follow-up · {new Date(f.created_at).toLocaleDateString("en-GB")}
                          {i === 0 ? " · latest" : ""}
                        </Eyebrow>
                        <p className="ld-small mt-1">
                          {s.shipped}/{s.pagesPlanned} shipped · {s.indexable} indexable ·
                          impressions 7d: {s.impressions7d ?? "—"} (baseline{" "}
                          {s.baselineImpressions7d ?? "—"})
                        </p>
                        {s.sections?.length ? (
                          <ul className="ld-chips mt-3">
                            {s.sections.map((sec) => (
                              <li key={sec.id}>
                                <Badge
                                  label={`${sec.title} · ${sec.slugs.length}`}
                                  classes={NEUTRAL}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyPromptButton prompt={f.prompt} />
                        <a
                          href={`data:text/markdown;charset=utf-8,${encodeURIComponent(f.prompt)}`}
                          download={`seo-followup-${s.host}-${day}.md`}
                          className="adm-btn adm-btn--ghost ld-sm"
                        >
                          Download .md
                        </a>
                      </div>
                    </div>
                  );
                  const pre = (
                    <pre className="ld-prompt__pre">
                      {f.prompt}
                    </pre>
                  );
                  return (
                    <div key={f.id} className="ld-card ld-card--flush">
                      {toolbar}
                      {i === 0 ? (
                        pre
                      ) : (
                        // Older follow-ups: prompt text behind a custom disclosure.
                        <Disclosure label="Show prompt" openLabel="Hide prompt">
                          {pre}
                        </Disclosure>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Embedded technical audit. */}
          <section>
            <SectionHeading index="08">Technical audit</SectionHeading>
            {report.audit ? (
              <div className="mt-6 flex flex-col gap-10">
                <AuditReportView report={report.audit} />
              </div>
            ) : (
              <p className="ld-small mt-4 max-w-prose">
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
