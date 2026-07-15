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
  seo_rank_snapshots: Array<{ rank: number | null; checked_at: string }>;
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

/* Movement between the two latest snapshots. Lower rank = better, so an
   improvement is previous minus latest. */
function Delta({ snaps }: { snaps: TrackedKeyword["seo_rank_snapshots"] }) {
  const [latest, previous] = snaps;
  if (!latest || !previous) return <span className="text-slate-ink">—</span>;
  if (latest.rank === null && previous.rank === null)
    return <span className="text-slate-ink">—</span>;
  if (latest.rank !== null && previous.rank === null)
    return <span className="font-mono text-[#3fb27f]">▲ entered</span>;
  if (latest.rank === null && previous.rank !== null)
    return <span className="font-mono text-[#e5594e]">▼ dropped out</span>;
  const diff = (previous.rank as number) - (latest.rank as number);
  if (diff > 0) return <span className="font-mono text-[#3fb27f]">▲ {diff}</span>;
  if (diff < 0) return <span className="font-mono text-[#e5594e]">▼ {-diff}</span>;
  return <span className="text-slate-ink">=</span>;
}

/* Movement between the two latest performance scores — higher = better,
   unlike ranks. */
function ScoreDelta({ latest, previous }: { latest?: number | null; previous?: number | null }) {
  if (typeof latest !== "number" || typeof previous !== "number")
    return <span className="text-slate-ink">—</span>;
  const diff = latest - previous;
  if (diff > 0) return <span className="font-mono text-[#3fb27f]">▲ {diff}</span>;
  if (diff < 0) return <span className="font-mono text-[#e5594e]">▼ {-diff}</span>;
  return <span className="text-slate-ink">=</span>;
}

/* Score trend, oldest → newest: line in the de-emphasis ink, latest point in
   the accent. The numbers beside it carry the values — the sparkline only
   carries the shape. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-xs text-slate-ink">—</span>;
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
  if (typeof ms !== "number") return <span className="text-slate-ink">—</span>;
  const color = ms <= good ? "#3fb27f" : ms <= poor ? "#d9a13d" : "#e5594e";
  const display = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
  return (
    <span className="font-mono text-ink">
      <span aria-hidden style={{ color }}>
        ●{" "}
      </span>
      {display}
    </span>
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
  const { data: trackedData, error: trackedError } = await supabase
    .from("seo_tracked_keywords")
    .select("id, host, keyword, language, seo_rank_snapshots(rank, checked_at)")
    .eq("active", true)
    .order("host")
    .order("checked_at", {
      referencedTable: "seo_rank_snapshots",
      ascending: false,
    })
    .limit(6, { referencedTable: "seo_rank_snapshots" });
  const tracked = (trackedData ?? []) as TrackedKeyword[];

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
            <p className="mt-2 max-w-prose text-sm text-slate-ink">
              The whole funnel in one job: the worker (see{" "}
              <code className="text-ink">worker/</code>) reads the site,
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

      {/* Weekly SERP positions for every strategy's head keywords. */}
      <div>
        <Eyebrow>Rank tracking ({tracked.length} keywords)</Eyebrow>
        {trackedError ? (
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
            Not set up yet — run{" "}
            <code className="text-ink">supabase/seo_rank_module.sql</code> once
            in the Supabase SQL editor. After that, every finished strategy
            seeds its head keywords here and the worker re-checks them weekly.
          </p>
        ) : tracked.length === 0 ? (
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
            No tracked keywords yet — they are seeded automatically when a
            strategy job finishes.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-neutral">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral">
                  <th className="eyebrow px-4 py-3 font-normal">Keyword</th>
                  <th className="eyebrow px-4 py-3 font-normal">Site</th>
                  <th className="eyebrow px-4 py-3 font-normal">Position</th>
                  <th className="eyebrow px-4 py-3 font-normal">Change</th>
                  <th className="eyebrow px-4 py-3 font-normal">History</th>
                  <th className="eyebrow px-4 py-3 font-normal">Checked</th>
                </tr>
              </thead>
              <tbody>
                {tracked.map((t) => {
                  const latest = t.seo_rank_snapshots[0];
                  return (
                    <tr key={t.id} className="border-b border-neutral last:border-0">
                      <td className="px-4 py-3 text-ink">
                        {t.keyword}
                        <span className="ml-2 text-xs text-slate-ink">{t.language}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-ink">{t.host}</td>
                      <td className="px-4 py-3">
                        {latest ? (
                          <span
                            className={`font-mono ${latest.rank !== null ? "text-ink" : "text-slate-ink"}`}
                          >
                            {rankLabel(latest.rank)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-ink">first check pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Delta snaps={t.seo_rank_snapshots} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-ink">
                        {t.seo_rank_snapshots
                          .slice()
                          .reverse()
                          .map((s) => rankLabel(s.rank))
                          .join(" → ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-ink">
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
        )}
      </div>

      {/* Weekly Lighthouse medians + real-user CrUX vitals per tracked URL —
          answers "did my last deploy make it slower?". */}
      <div>
        <Eyebrow>Speed history ({speedRows.length} tracked)</Eyebrow>
        {speedError ? (
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
            Not set up yet — run{" "}
            <code className="text-ink">supabase/seo_speed_module.sql</code> once
            in the Supabase SQL editor. After that, every{" "}
            <code className="text-ink">npm run seo:speed</code> run snapshots its
            medians here and the worker re-checks tracked URLs weekly.
          </p>
        ) : speedRows.length === 0 ? (
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-slate-ink">
            No speed snapshots yet — run{" "}
            <code className="text-ink">npm run seo:speed -- kagusoftware.com</code>{" "}
            once (or <code className="text-ink">--field-only</code> to backfill
            ~40 weeks of real-user history) and the worker keeps it fresh weekly.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-neutral">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral">
                  <th className="eyebrow px-4 py-3 font-normal">Page</th>
                  <th className="eyebrow px-4 py-3 font-normal">Device</th>
                  <th className="eyebrow px-4 py-3 font-normal">Perf</th>
                  <th className="eyebrow px-4 py-3 font-normal">Change</th>
                  <th className="eyebrow px-4 py-3 font-normal">Trend</th>
                  <th className="eyebrow px-4 py-3 font-normal">Field LCP</th>
                  <th className="eyebrow px-4 py-3 font-normal">Field INP</th>
                  <th className="eyebrow px-4 py-3 font-normal">Checked</th>
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
                    <tr key={r.key} className="border-b border-neutral last:border-0">
                      <td className="px-4 py-3 text-xs text-slate-ink">
                        {r.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-ink">{r.strategy}</td>
                      <td className="px-4 py-3">
                        {latest ? (
                          <span className="font-mono text-ink">
                            {latest.score}
                            {latest.regression && (
                              <span className="ml-2 text-xs text-[#e5594e]">▼ regression</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-ink">field only</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <ScoreDelta latest={latest?.score} previous={previous?.score} />
                      </td>
                      <td className="px-4 py-3">
                        <Sparkline values={series} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <FieldValue ms={r.field?.lcp_ms ?? null} good={2500} poor={4000} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <FieldValue ms={r.field?.inp_ms ?? null} good={200} poor={500} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-ink">
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
