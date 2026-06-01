import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteProject } from "../_actions/projects";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("projects")
    .select("id, project, slug, year, is_featured, is_published, clients(name)")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description="Case studies powering /work, the case detail pages, and the homepage Selected Work."
        action={
          <ButtonLink href="/admin/projects/new" variant="solid">
            + New project
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No projects yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-neutral border border-neutral">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <Link
                  href={`/admin/projects/${r.id}/edit`}
                  className="text-base text-ink transition-colors hover:text-mint-deep"
                >
                  {r.project}
                </Link>
                <p className="font-mono text-xs text-slate-ink">
                  {r.clients?.name ?? "—"} · {r.year ?? "—"} · /{r.slug}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {r.is_featured ? (
                  <span className="eyebrow text-mint-deep">Featured</span>
                ) : null}
                {!r.is_published ? (
                  <span className="eyebrow text-slate-ink">Draft</span>
                ) : null}
                <Link
                  href={`/admin/projects/${r.id}/edit`}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Edit
                </Link>
                <DeleteButton id={r.id} action={deleteProject} confirm={`Delete "${r.project}"?`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
