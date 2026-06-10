import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "../../_components/ui";
import { DeleteButton } from "../../_components/DeleteButton";
import { deleteLearning } from "../../_actions/learnings";
import { Markdown } from "../_components/Markdown";
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

  const toc = extractToc(learning.body);
  const edited = learning.updated_at.slice(0, 16) !== learning.created_at.slice(0, 16);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ButtonLink href="/admin/learnings">← All learnings</ButtonLink>
        <div className="flex items-center gap-4">
          <ButtonLink href={`/admin/learnings/${learning.id}/edit`}>Edit</ButtonLink>
          <DeleteButton
            id={learning.id}
            action={deleteLearning}
            confirm="Delete this learning? This cannot be undone."
          />
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[1fr_14rem] xl:gap-12">
        <article className="mx-auto w-full max-w-3xl">
          <header className="border-b border-neutral pb-8">
            {learning.tags.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {learning.tags.map((t) => (
                  <TagChip key={t} tag={t} href={`/admin/learnings?tag=${encodeURIComponent(t)}`} />
                ))}
              </div>
            ) : null}
            <h1 className="mt-4 text-3xl text-ink">{learning.title}</h1>
            {learning.summary ? (
              <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-ink">
                {learning.summary}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              <AuthorChip name={learning.author_name} email={learning.author_email} />
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
                {relativeDate(learning.created_at)}
                {edited ? ` · edited ${relativeDate(learning.updated_at)}` : ""}
                {" · "}
                {readingTime(learning.body)}
              </span>
            </div>
          </header>
          <div className="pt-8">
            <Markdown source={learning.body} />
          </div>
        </article>

        {toc.length > 1 ? (
          <nav
            aria-label="Table of contents"
            className="hidden xl:block"
          >
            <div className="sticky top-8 border-l border-neutral pl-5">
              <p className="eyebrow">On this page</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {toc.map((entry) => (
                  <li key={entry.id} className={entry.depth === 3 ? "pl-4" : ""}>
                    <a
                      href={`#${entry.id}`}
                      className="text-sm text-slate-ink transition-colors hover:text-mint-deep"
                    >
                      {entry.text}
                    </a>
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
