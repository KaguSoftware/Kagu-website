import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobStatusBadge } from "../../_components/JobStatusBadge";
import { AuditReportView } from "../../_components/AuditReportView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_audit_jobs")
    .select("url")
    .eq("id", (await params).id)
    .maybeSingle();
  return { title: data ? `Audit — ${data.url}` : "Site audit" };
}

const displayUrl = (url: string) =>
  url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

export default async function AuditJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("seo_audit_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();
  const report = job.report;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/leads/audit"
          className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 hover:text-ink hover:underline"
        >
          ← All audits
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="display text-2xl text-ink">{displayUrl(job.url)}</h2>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="mt-2 text-sm text-slate-ink">
          {job.pages_audited} pages audited (cap {job.max_pages}) ·{" "}
          {job.issues_found} issues · mobile-rendered, throttled 4G
          {job.finished_at
            ? ` · ${new Date(job.finished_at).toLocaleString("en-GB")}`
            : ""}
        </p>
        {job.error ? (
          <p className="mt-2 max-w-prose text-xs text-[#e5594e]">{job.error}</p>
        ) : null}
      </div>

      {!report ? (
        <p className="border border-dashed border-neutral p-8 text-center text-sm text-slate-ink">
          {job.status === "pending" || job.status === "running"
            ? "The report appears here once the worker finishes this audit."
            : "No report was produced for this audit."}
        </p>
      ) : (
        <AuditReportView report={report} />
      )}
    </div>
  );
}
