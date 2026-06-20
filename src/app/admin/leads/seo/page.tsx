import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../../_components/ui";
import { NewSeoModal } from "../_components/NewSeoModal";
import { SeoJobsLive } from "../_components/SeoJobsLive";

export const metadata = { title: "SEO keywords" };

export default async function SeoPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("seo_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <Eyebrow>SEO keyword research</Eyebrow>
          <p className="mt-2 max-w-prose text-sm text-slate-ink">
            Queue a seed query and the crawler worker (see{" "}
            <code className="text-ink">worker/</code>) scrapes the top organic
            results — skipping sponsored ads — crawls them, and ranks the
            keywords that got them there. If nothing moves, the worker
            isn&apos;t running.
          </p>
        </div>
        <NewSeoModal />
      </div>
      <SeoJobsLive initial={jobs ?? []} />
    </div>
  );
}
