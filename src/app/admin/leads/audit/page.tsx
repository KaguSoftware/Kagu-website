import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../../_components/ui";
import { NewAuditModal } from "../_components/NewAuditModal";
import { AuditJobsLive } from "../_components/AuditJobsLive";

export const metadata = { title: "SEO site audit" };

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("seo_audit_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <Eyebrow>SEO site audit</Eyebrow>
          <p className="mt-2 max-w-prose text-sm text-slate-ink">
            Queue any website URL and the crawler worker (see{" "}
            <code className="text-ink">worker/</code>) crawls it as a throttled
            mobile phone — Google indexes mobile-first — and scores headings,
            meta, mobile usability, speed, images, indexability, links, and
            structured data. Every issue comes with why it matters and the
            exact fix. If nothing moves, the worker isn&apos;t running.
          </p>
        </div>
        <NewAuditModal />
      </div>
      <AuditJobsLive initial={jobs ?? []} />
    </div>
  );
}
