import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../../_components/ui";
import { JobsLive } from "../_components/JobsLive";
import { NewScrapeModal } from "../_components/NewScrapeModal";

export const metadata = { title: "Scrape jobs" };

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("scrape_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <Eyebrow>Scrape jobs</Eyebrow>
          <p className="ld-sub mt-2">
            Jobs are queued here and processed by the crawler worker (see{" "}
            <code>worker/</code>). If nothing moves, the
            worker isn&apos;t running.
          </p>
        </div>
        <NewScrapeModal />
      </div>
      <JobsLive initial={jobs ?? []} />
    </div>
  );
}
