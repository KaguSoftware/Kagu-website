import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink } from "../_components/ui";
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

      {spotlight ? (
        <Link
          href={`/admin/learnings/${spotlight.id}`}
          className="group relative block overflow-hidden border border-neutral bg-mint-pale p-6 transition-colors hover:border-mint-deep sm:p-8"
        >
          {/* Oversized ghost index — editorial poster feel */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -bottom-8 font-mono text-[7rem] leading-none text-neutral/25 select-none sm:text-[9rem]"
          >
            {String(all.length).padStart(2, "0")}
          </span>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-mint-deep px-2 py-0.5 font-mono text-xs uppercase tracking-[0.18em] text-paper">
                Latest
              </span>
              {spotlight.tags.slice(0, 3).map((t) => (
                <TagChip key={t} tag={t} />
              ))}
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl text-ink transition-colors group-hover:text-mint-deep">
              {spotlight.title}
            </h2>
            {spotlight.summary ? (
              <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-ink">
                {spotlight.summary}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              <AuthorChip name={spotlight.author_name} email={spotlight.author_email} />
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
                {relativeDate(spotlight.created_at)} · {readingTime(spotlight.body)}
              </span>
              <span
                aria-hidden
                className="ml-auto font-mono text-lg text-slate-ink transition-all group-hover:translate-x-1 group-hover:text-mint-deep"
              >
                →
              </span>
            </div>
          </div>
        </Link>
      ) : null}

      {!list.length && !spotlight ? (
        <div className="border border-dashed border-neutral p-10 text-center">
          {all.length === 0 ? (
            <>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-mint-deep">
                Blank page, big opportunity
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-ink">
                No learnings yet. The first thing you write becomes the page
                everyone else copies — be the precedent.
              </p>
              <div className="mt-6">
                <ButtonLink href="/admin/learnings/new" variant="solid">
                  Write the first one
                </ButtonLink>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-ink">Nothing matches these filters.</p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((l, i) => {
            // Stable archive number: newest = highest. Under filters the global
            // position is unknown, so fall back to simple list order.
            const number = filtering
              ? String(list.length - i).padStart(2, "0")
              : String(all.length - 1 - i).padStart(2, "0");
            return (
              <li key={l.id}>
                <article className="group relative flex gap-5 border border-neutral bg-paper p-6 transition-colors hover:border-mint-deep">
                  <span className="hidden pt-0.5 font-mono text-xs text-slate-ink/60 sm:block">
                    {number}
                  </span>
                  <div className="min-w-0 flex-1">
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
                  </div>
                  <span
                    aria-hidden
                    className="hidden self-center font-mono text-lg text-transparent transition-all group-hover:translate-x-1 group-hover:text-mint-deep sm:block"
                  >
                    →
                  </span>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
