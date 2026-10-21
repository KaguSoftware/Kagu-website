import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteCapability } from "../_actions/capabilities";
import { RowList, Row } from "../_cms/cms";

export default async function CapabilitiesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("capabilities")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="What We Build"
        description="Service / capability cards on the homepage."
        action={
          <ButtonLink href="/admin/capabilities/new" variant="solid">
            + New card
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No capabilities yet.</EmptyState>
      ) : (
        <RowList>
          {rows.map((r) => (
            <Row
              key={r.id}
              href={`/admin/capabilities/${r.id}/edit`}
              title={r.title}
              meta={r.body}
              actions={
                <DeleteButton id={r.id} action={deleteCapability} confirm={`Delete "${r.title}"?`} />
              }
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
