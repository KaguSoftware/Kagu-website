import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { LearningFilters } from "./_components/LearningFilters";
import { TagChip, AuthorChip, relativeDate } from "./_components/chips";
import { readingTime } from "./_lib/markdown";

export type LearningsParams = {
  q?: string;
  tag?: string;
  author?: string;
};

export default async function LearningsPage({
  searchParams,
}: {
  searchParams: Promise<LearningsParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("learnings")
    .select("id,title,summary,body,tags,author_email,author_name,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (params.q) {
    // Strip PostgREST .or() syntax characters from the user's search text.
    const q = params.q.replace(/[,%()]/g, " ").trim();
    if (q) {
      query = query.or(
        `title.ilike.%${q}%,summary.ilike.%${q}%,body.ilike.%${q}%`,
      );
    }
  }
  if (params.tag) query = query.contains("tags", [params.tag]);
  if (params.author) query = query.eq("author_email", params.author);

  // Facets (tags / authors / stats) come from the unfiltered set so the
  // dropdowns don't collapse to the current filter.
  const [{ data: learnings }, { data: facets }] = await Promise.all([
    query,
    supabase
      .from("learnings")
      .select("tags,author_email,author_name,updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const all = facets ?? [];
  const tags = Array.from(new Set(all.flatMap((r) => r.tags))).sort();
  const authors = Array.from(
    new Map(
      all.map((r) => [
        r.author_email,
        { email: r.author_email, label: r.author_name || r.author_email },
      ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));
  const lastUpdated = all[0]?.updated_at;

  const stats = [
    `${all.length} ${all.length === 1 ? "learning" : "learnings"}`,
    `${authors.length} ${authors.length === 1 ? "contributor" : "contributors"}`,
    ...(lastUpdated ? [`updated ${relativeDate(lastUpdated)}`] : []),
  ].join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learnings"
        description="The team knowledge base — write up what you figured out so the next person doesn't have to."
        action={<ButtonLink href="/admin/learnings/new" variant="solid">New learning</ButtonLink>}
      />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
        {stats}
      </p>
      <LearningFilters params={params} tags={tags} authors={authors} />

      {!learnings?.length ? (
        <EmptyState>
          {all.length === 0
            ? "No learnings yet — be the first to document something the team should know."
            : "Nothing matches these filters."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {learnings.map((l) => (
            <li key={l.id}>
              <article className="group relative border border-neutral bg-paper p-6 transition-colors hover:border-mint-deep">
                <div className="flex flex-wrap items-center gap-2">
                  {l.tags.map((t) => (
                    <TagChip key={t} tag={t} />
                  ))}
                </div>
                <h2 className={`text-lg text-ink ${l.tags.length ? "mt-3" : ""}`}>
                  <Link
                    href={`/admin/learnings/${l.id}`}
                    className="transition-colors after:absolute after:inset-0 group-hover:text-mint-deep"
                  >
                    {l.title}
                  </Link>
                </h2>
                {l.summary ? (
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-ink">
                    {l.summary}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <AuthorChip name={l.author_name} email={l.author_email} />
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
                    {relativeDate(l.created_at)} · {readingTime(l.body)}
                  </span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
