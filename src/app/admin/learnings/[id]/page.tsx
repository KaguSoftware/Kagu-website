import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "../../_components/ui";
import { DeleteButton } from "../../_components/DeleteButton";
import { deleteLearning } from "../../_actions/learnings";
import { Markdown } from "../_components/Markdown";
import { ReadingProgress } from "../_components/ReadingProgress";
import { TagChip, AuthorChip, relativeDate } from "../_components/chips";
import { extractToc, readingTime } from "../_lib/markdown";

async function getLearning(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("learnings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const learning = await getLearning((await params).id);
  return { title: learning ? learning.title : "Learning" };
}

export default async function LearningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const learning = await getLearning((await params).id);
  if (!learning) notFound();

  // Neighbours by creation date for prev/next reading flow.
  const supabase = await createClient();
  const [{ data: older }, { data: newer }] = await Promise.all([
    supabase
      .from("learnings")
      .select("id,title")
      .lt("created_at", learning.created_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("learnings")
      .select("id,title")
      .gt("created_at", learning.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const toc = extractToc(learning.body);
  const edited = learning.updated_at.slice(0, 16) !== learning.created_at.slice(0, 16);

  return (
    <div>
      <ReadingProgress />
      <div className="lr-bar">
        <ButtonLink href="/admin/learnings">← All learnings</ButtonLink>
        <div className="lr-bar__acts">
          <ButtonLink href={`/admin/learnings/${learning.id}/edit`}>Edit</ButtonLink>
          <DeleteButton
            id={learning.id}
            action={deleteLearning}
            confirm="Delete this learning? This cannot be undone."
          />
        </div>
      </div>

      <div className="lr-layout">
        <article className="lr-article">
          <header className="lr-head">
            {learning.tags.length ? (
              <div className="lr-tags">
                {learning.tags.map((t) => (
                  <TagChip key={t} tag={t} href={`/admin/learnings?tag=${encodeURIComponent(t)}`} />
                ))}
              </div>
            ) : null}
            <h1 className="lr-head__title">{learning.title}</h1>
            {learning.summary ? <p className="lr-head__sum">{learning.summary}</p> : null}
            <div className="lr-head__meta">
              <AuthorChip name={learning.author_name} email={learning.author_email} />
              <span className="lr-meta">
                {relativeDate(learning.created_at)}
                {edited ? ` · edited ${relativeDate(learning.updated_at)}` : ""}
                {" · "}
                {readingTime(learning.body)}
              </span>
            </div>
          </header>
          <div className="lr-article__body">
            <Markdown source={learning.body} />
          </div>

          {older || newer ? (
            <nav aria-label="More learnings" className="lr-pn">
              {older ? (
                <Link href={`/admin/learnings/${older.id}`} className="lr-pn__item" data-side="prev">
                  <span className="lr-pn__dir">← Older</span>
                  <p className="lr-pn__title">{older.title}</p>
                </Link>
              ) : (
                <span aria-hidden />
              )}
              {newer ? (
                <Link href={`/admin/learnings/${newer.id}`} className="lr-pn__item" data-side="next">
                  <span className="lr-pn__dir">Newer →</span>
                  <p className="lr-pn__title">{newer.title}</p>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </article>

        {toc.length > 1 ? (
          <nav aria-label="Table of contents" className="hidden xl:block">
            <div className="lr-toc">
              <p className="eyebrow">On this page</p>
              <ul>
                {toc.map((entry) => (
                  <li key={entry.id} className={entry.depth === 3 ? "pl-4" : ""}>
                    <a href={`#${entry.id}`}>{entry.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
