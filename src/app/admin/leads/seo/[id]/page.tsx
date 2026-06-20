import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../../../_components/ui";
import { JobStatusBadge } from "../../_components/JobStatusBadge";
import { SEO_INTENT_CLASSES } from "../../_lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_jobs")
    .select("seed")
    .eq("id", (await params).id)
    .maybeSingle();
  return { title: data ? `SEO — ${data.seed}` : "SEO research" };
}

export default async function SeoJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const supabase = await createClient();

  const [{ data: job }, { data: keywords }] = await Promise.all([
    supabase.from("seo_jobs").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("seo_keywords")
      .select("*")
      .eq("job_id", id)
      .order("refined", { ascending: false })
      .order("rank", { ascending: true }),
  ]);

  if (!job) notFound();

  const refined = (keywords ?? []).filter((k) => k.refined);
  const raw = (keywords ?? []).filter((k) => !k.refined);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Link
          href="/admin/leads/seo"
          className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 hover:text-ink hover:underline"
        >
          ← All research
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="display text-2xl text-ink">{job.seed}</h2>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="mt-2 text-sm text-slate-ink">
          region {job.region} · language {job.language} · {job.pages_crawled}{" "}
          pages crawled · {job.ads_skipped} sponsored skipped
        </p>
        {job.error ? (
          <p className="mt-2 max-w-prose text-xs text-[#e5594e]">{job.error}</p>
        ) : null}
      </div>

      {/* Top organic results the keywords were learned from. */}
      {job.organic.length > 0 && (
        <div>
          <Eyebrow>Top organic results learned from</Eyebrow>
          <ol className="mt-3 flex flex-col gap-1.5 text-sm">
            {job.organic.map((o) => (
              <li key={`${o.rank}-${o.url}`} className="flex gap-3">
                <span className="w-6 shrink-0 text-right font-mono text-xs text-slate-ink">
                  {o.rank}
                </span>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-ink underline-offset-4 hover:underline"
                  title={o.title}
                >
                  <span className="text-mint-deep">{o.domain}</span>
                  <span className="text-slate-ink"> — {o.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Groq-curated recommendations (when a key was configured). */}
      {refined.length > 0 && (
        <div>
          <Eyebrow>Recommended keywords</Eyebrow>
          <div className="mt-3 overflow-x-auto border border-neutral">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral">
                  <th className="eyebrow px-4 py-3 font-normal">Keyword</th>
                  <th className="eyebrow px-4 py-3 font-normal">Intent</th>
                  <th className="eyebrow px-4 py-3 font-normal">Why</th>
                </tr>
              </thead>
              <tbody>
                {refined.map((k) => (
                  <tr key={k.id} className="border-b border-neutral last:border-0">
                    <td className="px-4 py-3 text-ink">{k.keyword}</td>
                    <td className="px-4 py-3">
                      {k.intent ? (
                        <span
                          className={`inline-block border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${
                            SEO_INTENT_CLASSES[k.intent] ?? "border-neutral text-slate-ink"
                          }`}
                        >
                          {k.intent}
                        </span>
                      ) : (
                        <span className="text-slate-ink">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-ink">{k.rationale || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw on-page-signal ranking (always present once a job is done). */}
      <div>
        <Eyebrow>On-page signal ranking</Eyebrow>
        <p className="mt-1 text-xs text-slate-ink">
          Score weights raw frequency plus appearances in titles, headings, meta,
          and across multiple top pages.
        </p>
        {raw.length > 0 ? (
          <div className="mt-3 overflow-x-auto border border-neutral">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral">
                  <th className="eyebrow px-4 py-3 font-normal">Keyword</th>
                  <th className="eyebrow px-4 py-3 font-normal">Score</th>
                  <th className="eyebrow px-4 py-3 font-normal">Title</th>
                  <th className="eyebrow px-4 py-3 font-normal">Head</th>
                  <th className="eyebrow px-4 py-3 font-normal">Meta</th>
                  <th className="eyebrow px-4 py-3 font-normal">Pages</th>
                  <th className="eyebrow px-4 py-3 font-normal">Freq</th>
                </tr>
              </thead>
              <tbody>
                {raw.map((k) => (
                  <tr key={k.id} className="border-b border-neutral last:border-0">
                    <td className="px-4 py-3 text-ink">{k.keyword}</td>
                    <td className="px-4 py-3 text-ink">{k.score}</td>
                    <td className="px-4 py-3 text-slate-ink">{k.title_hits ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-ink">{k.heading_hits ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-ink">{k.meta_hits ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-ink">{k.pages ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-ink">{k.frequency ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 border border-dashed border-neutral p-8 text-center text-sm text-slate-ink">
            {job.status === "done"
              ? "No keywords were extracted for this query."
              : "Keywords appear here once the worker finishes this job."}
          </p>
        )}
      </div>
    </div>
  );
}
