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
    </div>
  );
}
