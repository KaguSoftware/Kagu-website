import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../../_components/ui";
import { NewStrategyModal } from "../_components/NewStrategyModal";
import { StrategyJobsLive } from "../_components/StrategyJobsLive";

export const metadata = { title: "SEO" };

type TrackedKeyword = {
  id: string;
  host: string;
  keyword: string;
  language: string;
  kind?: "head" | "cluster"; // absent until seo_rank_module.sql is re-run
  seo_rank_snapshots: Array<{
    rank: number | null;
    source?: "serp" | "gsc";
    position?: number | null;
    impressions?: number | null;
    clicks?: number | null;
    checked_at: string;
  }>;
};

type SpeedTrackedUrl = {
  id: string;
  url: string;
  host: string;
  seo_speed_snapshots: Array<{
    strategy: string;
    source: string;
    score: number | null;
    lcp_ms: number | null;
    inp_ms: number | null;
    regression: boolean;
    checked_at: string;
  }>;
};

type SpeedSnapshot = SpeedTrackedUrl["seo_speed_snapshots"][number];

const rankLabel = (r: number | null) => (r === null ? "—" : `#${r}`);

/* Movement between the latest snapshot and the most recent earlier one from
   the SAME source. Lower rank = better, so an improvement is previous minus
   latest. A SERP snapshot (top-10 or nothing) and a GSC one (average position,
   can be 48) are not comparable — mixing them would show a keyword "entering"
   at #48 the week GSC first answered. */
function Delta({ snaps }: { snaps: TrackedKeyword["seo_rank_snapshots"] }) {
  const [latest] = snaps;
  const previous = snaps.slice(1).find((s) => (s.source ?? "serp") === (latest?.source ?? "serp"));
  if (!latest || !previous) return <span className="ld-t-muted">—</span>;
  if (latest.rank === null && previous.rank === null)
    return <span className="ld-t-muted">—</span>;
  if (latest.rank !== null && previous.rank === null)
    return <span className="ld-t-ok">▲ entered</span>;
  if (latest.rank === null && previous.rank !== null)
    return <span className="ld-t-bad">▼ dropped out</span>;
  const diff = (previous.rank as number) - (latest.rank as number);
  if (diff > 0) return <span className="ld-t-ok">▲ {diff}</span>;
  if (diff < 0) return <span className="ld-t-bad">▼ {-diff}</span>;
  return <span className="ld-t-muted">=</span>;
}

/* Movement between the two latest performance scores — higher = better,
   unlike ranks. */
function ScoreDelta({ latest, previous }: { latest?: number | null; previous?: number | null }) {
  if (typeof latest !== "number" || typeof previous !== "number")
    return <span className="ld-t-muted">—</span>;
  const diff = latest - previous;
  if (diff > 0) return <span className="ld-t-ok">▲ {diff}</span>;
  if (diff < 0) return <span className="ld-t-bad">▼ {-diff}</span>;
  return <span className="ld-t-muted">=</span>;
}

/* Score trend, oldest → newest: line in the de-emphasis ink, latest point in
   the accent. The numbers beside it carry the values — the sparkline only
   carries the shape. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="ld-small">—</span>;
  const w = 110;
  const h = 26;
  const padY = 3;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const x = (i: number) => 3 + (i / (values.length - 1)) * (w - 6);
  const y = (v: number) => h - padY - ((v - min) / span) * (h - 2 * padY);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lastIdx = values.length - 1;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`performance score trend: ${values.join(", ")}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-ink"
      />
      <circle cx={x(lastIdx)} cy={y(values[lastIdx])} r="2.5" fill="currentColor" className="text-ink" />
    </svg>
  );
}

/* Field p75 with Google's grading — value always printed, color is only the
   secondary channel. */
function FieldValue({ ms, good, poor }: { ms: number | null; good: number; poor: number }) {
  if (typeof ms !== "number") return <span className="ld-t-muted">—</span>;
  const tone = ms <= good ? "ld-pill--ok" : ms <= poor ? "ld-pill--warn" : "ld-pill--bad";
  const display = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
  return (
    <span className={`ld-pill ${tone}`}>{display}</span>
  );
}

export default async function SeoPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("seo_strategy_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // Rank tracking tables come from supabase/seo_rank_module.sql — until that
  // module is applied this query errors and the section shows the setup hint.
  // The extended select (kind + GSC columns) also errors on a database that
  // only has the original module, so retry the original columns before giving
  // up and treat those rows as head keywords from the SERP.
  const rankQuery = (select: string) =>
    supabase
      .from("seo_tracked_keywords")
      .select(select)
      .eq("active", true)
      .order("host")
      .order("checked_at", {
        referencedTable: "seo_rank_snapshots",
        ascending: false,
      })
      .limit(6, { referencedTable: "seo_rank_snapshots" });
  let { data: trackedData, error: trackedError } = await rankQuery(
    "id, host, keyword, language, kind, seo_rank_snapshots(rank, source, position, impressions, clicks, checked_at)"
  );
  let rankLegacy = false;
  if (trackedError) {
    const fallback = await rankQuery(
      "id, host, keyword, language, seo_rank_snapshots(rank, checked_at)"
    );
    trackedData = fallback.data;
    trackedError = fallback.error;
    rankLegacy = !fallback.error;
  }
  // Per host: head keywords first, then their cluster keywords.
  const tracked = ((trackedData ?? []) as unknown as TrackedKeyword[])
    .map((t, i) => ({ t, i }))
    .sort(
      (a, b) =>
        a.t.host.localeCompare(b.t.host) ||
        Number(a.t.kind === "cluster") - Number(b.t.kind === "cluster") ||
        a.i - b.i
    )
    .map(({ t }) => t);

  // Speed history tables come from supabase/seo_speed_module.sql — until that
  // module is applied this query errors and the section shows the setup hint.
  // The embedded limit is generous because Lighthouse and weekly CrUX rows
  // share the table and both accumulate.
  const { data: speedData, error: speedError } = await supabase
    .from("seo_speed_tracked_urls")
    .select(
      "id, url, host, seo_speed_snapshots(strategy, source, score, lcp_ms, inp_ms, regression, checked_at)"
    )
    .eq("active", true)
    .order("url")
    .order("checked_at", {
      referencedTable: "seo_speed_snapshots",
      ascending: false,
    })
    .limit(200, { referencedTable: "seo_speed_snapshots" });
  const speedTracked = (speedData ?? []) as SpeedTrackedUrl[];

  // One row per URL × device: Lighthouse snapshots feed the score trend,
  // the newest CrUX row supplies the real-user vitals.
  const speedRows = speedTracked.flatMap((t) =>
    ["mobile", "desktop"]
      .map((strategy) => {
        const lab = t.seo_speed_snapshots.filter(
          (s): s is SpeedSnapshot & { score: number } =>
            s.strategy === strategy && s.source === "lighthouse" && typeof s.score === "number"
        );
        const field = t.seo_speed_snapshots.find(
          (s) => s.strategy === strategy && s.source === "crux"
        );
        return { key: `${t.id}-${strategy}`, url: t.url, host: t.host, strategy, lab, field };
      })
      .filter((r) => r.lab.length > 0 || r.field)
  );

  return (
    <div className="flex flex-col gap-12">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div>
            <Eyebrow>SEO</Eyebrow>
            <p className="ld-sub mt-2">
              The whole funnel in one job: the worker (see{" "}
              <code>worker/</code>) reads the site,
              understands the business, checks real searches against the live
              SERP plus autocomplete demand (and Search Console when connected),
              maps the market, grades each keyword&apos;s winnability, runs the
              technical audit, and writes one master prompt to paste into a
              coding agent. If nothing moves, the worker isn&apos;t running.
            </p>
          </div>
          <NewStrategyModal />
        </div>
        <StrategyJobsLive initial={jobs ?? []} />
      </div>

      {/* Weekly positions — Search Console first, live SERP as fallback — for
          every strategy's head and cluster keywords. */}
      <div>
        <Eyebrow>Rank tracking ({tracked.length} keywords)</Eyebrow>
        {trackedError ? (
          <p className="ld-small mt-3 max-w-prose">
            Not set up yet — run{" "}
            <code>supabase/seo_rank_module.sql</code> once
            in the Supabase SQL editor. After that, every finished strategy
            seeds its head and cluster keywords here and the worker re-checks
            them weekly, Search Console first with the live SERP as fallback.
          </p>
        ) : tracked.length === 0 ? (
          <p className="ld-small mt-3 max-w-prose">
            No tracked keywords yet — head and cluster keywords are seeded
            automatically when a strategy job finishes, then tracked weekly
            (Search Console first, live SERP as fallback).
          </p>
        ) : (
          <>
          {rankLegacy ? (
            <p className="ld-small mt-3 max-w-prose">
              Re-run{" "}
              <code>supabase/seo_rank_module.sql</code> to
              enable GSC-first tracking and cluster keywords.
            </p>
          ) : null}
          <div className="ld-wrap mt-3">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Site</th>
                  <th>Position</th>
                  <th>Change</th>
                  <th>History</th>
                  <th>Checked</th>
                </tr>
              </thead>
              <tbody>
                {tracked.map((t) => {
                  const latest = t.seo_rank_snapshots[0];
                  const isCluster = t.kind === "cluster";
                  const source = latest?.source ?? "serp";
                  return (
                    <tr key={t.id}>
                      <td style={isCluster ? { paddingLeft: 36 } : undefined}>
                        {t.keyword}
                        <span className="ld-small ml-2">{t.language}</span>
                        {isCluster ? (
                          <span className="ld-tag ld-tag--quiet ml-2">cluster</span>
                        ) : null}
                      </td>
                      <td className="ld-small">{t.host}</td>
                      <td>
                        {latest ? (
                          <span
                            className={latest.rank !== null ? "font-medium text-ink" : "ld-t-muted"}
                          >
                            {rankLabel(latest.rank)}
                            {source === "gsc" && typeof latest.position === "number" ? (
                              <span className="ld-small ml-1">
                                ({Number(latest.position).toFixed(1)})
                              </span>
                            ) : null}
                            <span className="ld-lbl ml-2">
                              {source === "gsc" ? "GSC" : "SERP"}
                              {source === "gsc" && typeof latest.impressions === "number"
                                ? ` · ${latest.impressions} impr`
                                : ""}
                            </span>
                          </span>
                        ) : (
                          <span className="ld-small">first check pending</span>
                        )}
                      </td>
                      <td>
                        <Delta snaps={t.seo_rank_snapshots} />
                      </td>
                      <td className="ld-small">
                        {t.seo_rank_snapshots
                          .slice()
                          .reverse()
                          .map((s) => rankLabel(s.rank))
                          .join(" → ") || "—"}
                      </td>
                      <td className="ld-small ld-w">
                        {latest
                          ? new Date(latest.checked_at).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Weekly Lighthouse medians + real-user CrUX vitals per tracked URL —
          answers "did my last deploy make it slower?". */}
      <div>
        <Eyebrow>Speed history ({speedRows.length} tracked)</Eyebrow>
        {speedError ? (
          <p className="ld-small mt-3 max-w-prose">
            Not set up yet — run{" "}
            <code>supabase/seo_speed_module.sql</code> once
            in the Supabase SQL editor. After that, every{" "}
            <code>npm run seo:speed</code> run snapshots its
            medians here and the worker re-checks tracked URLs weekly.
          </p>
        ) : speedRows.length === 0 ? (
          <p className="ld-small mt-3 max-w-prose">
            No speed snapshots yet — run{" "}
            <code>npm run seo:speed -- kagusoftware.com</code>{" "}
            once (or <code>--field-only</code> to backfill
            ~40 weeks of real-user history) and the worker keeps it fresh weekly.
          </p>
        ) : (
          <div className="ld-wrap mt-3">
            <table className="ld-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Device</th>
                  <th>Perf</th>
                  <th>Change</th>
                  <th>Trend</th>
                  <th>Field LCP</th>
                  <th>Field INP</th>
                  <th>Checked</th>
                </tr>
              </thead>
              <tbody>
                {speedRows.map((r) => {
                  const latest = r.lab[0];
                  const previous = r.lab[1];
                  // Oldest → newest for the sparkline, capped at 12 points.
                  const series = r.lab
                    .slice(0, 12)
                    .map((s) => s.score)
                    .reverse();
                  const checked = latest ?? r.field;
                  return (
                    <tr key={r.key}>
                      <td className="ld-small">
                        {r.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </td>
                      <td className="ld-small">{r.strategy}</td>
                      <td>
                        {latest ? (
                          <span className="font-medium text-ink">
                            {latest.score}
                            {latest.regression && (
                              <span className="ld-pill ld-pill--bad ml-2">regression</span>
                            )}
                          </span>
                        ) : (
                          <span className="ld-small">field only</span>
                        )}
                      </td>
                      <td>
                        <ScoreDelta latest={latest?.score} previous={previous?.score} />
                      </td>
                      <td>
                        <Sparkline values={series} />
                      </td>
                      <td>
                        <FieldValue ms={r.field?.lcp_ms ?? null} good={2500} poor={4000} />
                      </td>
                      <td>
                        <FieldValue ms={r.field?.inp_ms ?? null} good={200} poor={500} />
                      </td>
                      <td className="ld-small ld-w">
                        {checked
                          ? new Date(checked.checked_at).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
