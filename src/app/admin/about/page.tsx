import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteAboutBlock } from "../_actions/about";
import { RowList, Row, Badge } from "../_cms/cms";

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("about_blocks")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="About"
        description="Editable blocks for the About page: mission, paragraphs, principles, and metrics."
        action={
          <ButtonLink href="/admin/about/new" variant="solid">
            + New block
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No about blocks yet.</EmptyState>
      ) : (
        <RowList>
          {rows.map((r) => (
            <Row
              key={r.id}
              href={`/admin/about/${r.id}/edit`}
              title={r.title || r.body || r.value || "—"}
              meta={r.kind === "metric" && r.value ? r.value : undefined}
              badges={<Badge>{r.kind}</Badge>}
              actions={<DeleteButton id={r.id} action={deleteAboutBlock} confirm="Delete this block?" />}
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
