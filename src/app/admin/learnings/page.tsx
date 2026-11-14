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
  const filtering = Boolean(params.q || params.tag || params.author);
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

  // Top contributor — a little friendly competition.
  const counts = new Map<string, number>();
  for (const r of all) counts.set(r.author_email, (counts.get(r.author_email) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topLabel = top
    ? authors.find((a) => a.email === top[0])?.label.split(/[@\s]/)[0]
    : null;

  const stats = [
    `${all.length} ${all.length === 1 ? "learning" : "learnings"}`,
    `${authors.length} ${authors.length === 1 ? "contributor" : "contributors"}`,
    ...(topLabel && top![1] > 1 ? [`${topLabel} leads with ${top![1]}`] : []),
    ...(all[0] ? [`updated ${relativeDate(all[0].updated_at)}`] : []),
  ].join(" · ");

  // The newest entry gets the spotlight (only in the default, unfiltered view).
  const [spotlight, ...rest] = !filtering && learnings ? learnings : [];
  const list = filtering ? learnings ?? [] : rest;

  return (
    <div>
      <PageHeader
        title="Learnings"
        description="The team knowledge base — write up what you figured out so the next person doesn't have to."
        action={<ButtonLink href="/admin/learnings/new" variant="solid">New learning</ButtonLink>}
      />
      <p className="lr-stats">{stats}</p>
      <LearningFilters params={params} tags={tags} authors={authors} />

      {spotlight ? (
        <Link href={`/admin/learnings/${spotlight.id}`} className="lr-feature">
          <div className="lr-feature__top">
            <span className="lr-flag">Latest</span>
            {spotlight.tags.slice(0, 3).map((t) => (
              <TagChip key={t} tag={t} />
            ))}
          </div>
          <h2 className="lr-feature__title">{spotlight.title}</h2>
          {spotlight.summary ? <p className="lr-feature__sum">{spotlight.summary}</p> : null}
          <div className="lr-feature__foot">
            <AuthorChip name={spotlight.author_name} email={spotlight.author_email} />
            <span className="lr-meta">
              {relativeDate(spotlight.created_at)} · {readingTime(spotlight.body)}
            </span>
            <span aria-hidden className="lr-arrow">
              →
            </span>
          </div>
        </Link>
      ) : null}

      {!list.length && !spotlight ? (
        <div className="lr-empty-wrap">
          {all.length === 0 ? (
            <EmptyState>
              No learnings yet. The first thing you write becomes the page everyone
              else copies — be the precedent.
              <span className="lr-empty__act">
                <ButtonLink href="/admin/learnings/new" variant="solid">
                  Write the first one
                </ButtonLink>
              </span>
            </EmptyState>
          ) : (
            <EmptyState>Nothing matches these filters.</EmptyState>
          )}
        </div>
      ) : list.length ? (
        <ul className="lr-list">
          {list.map((l) => (
            <li key={l.id} className="lr-row">
              <div className="lr-row__body">
                {l.tags.length ? (
                  <div className="lr-tags">
                    {l.tags.map((t) => (
                      <TagChip key={t} tag={t} />
                    ))}
                  </div>
                ) : null}
                <h2 className="lr-row__title">
                  <Link href={`/admin/learnings/${l.id}`}>{l.title}</Link>
                </h2>
                {l.summary ? <p className="lr-row__sum">{l.summary}</p> : null}
                <div className="lr-row__meta">
                  <AuthorChip name={l.author_name} email={l.author_email} />
                  <span className="lr-meta">
                    {relativeDate(l.created_at)} · {readingTime(l.body)}
                  </span>
                </div>
              </div>
              <span aria-hidden className="lr-arrow hidden sm:block">
                →
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
