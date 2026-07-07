import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../../_components/ui";
import { NewStrategyModal } from "../_components/NewStrategyModal";
import { StrategyJobsLive } from "../_components/StrategyJobsLive";

export const metadata = { title: "SEO strategy" };

export default async function StrategyPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("seo_strategy_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <Eyebrow>SEO strategy</Eyebrow>
          <p className="mt-2 max-w-prose text-sm text-slate-ink">
            The whole funnel in one job: the worker (see{" "}
            <code className="text-ink">worker/</code>) reads the site,
            understands the business, checks real searches against the live
            SERP plus autocomplete demand (and Search Console when connected),
            grades each keyword&apos;s winnability, runs the technical audit,
            and writes one master prompt to paste into a coding agent. If
            nothing moves, the worker isn&apos;t running.
          </p>
        </div>
        <NewStrategyModal />
      </div>
      <StrategyJobsLive initial={jobs ?? []} />
    </div>
  );
}
