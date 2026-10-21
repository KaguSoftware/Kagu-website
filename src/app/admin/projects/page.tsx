import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteProject } from "../_actions/projects";
import { RowList, Row, Badge } from "../_cms/cms";

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
        <RowList>
          {rows.map((r) => (
            <Row
              key={r.id}
              href={`/admin/projects/${r.id}/edit`}
              title={r.project}
              meta={`${r.clients?.name ?? "—"} · ${r.year ?? "—"} · /${r.slug}`}
              badges={
                <>
                  {r.is_featured ? <Badge tone="ok">Featured</Badge> : null}
                  {!r.is_published ? <Badge tone="warn">Draft</Badge> : null}
                </>
              }
              actions={
                <DeleteButton id={r.id} action={deleteProject} confirm={`Delete "${r.project}"?`} />
              }
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
