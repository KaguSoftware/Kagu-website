import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteApproachStep } from "../_actions/approach";
import { RowList, Row } from "../_cms/cms";

export default async function ApproachPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("approach_steps")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Approach"
        description="The numbered 'how we work' steps on the homepage."
        action={
          <ButtonLink href="/admin/approach/new" variant="solid">
            + New step
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No steps yet.</EmptyState>
      ) : (
        <RowList>
          {rows.map((r) => (
            <Row
              key={r.id}
              href={`/admin/approach/${r.id}/edit`}
              lead={r.number}
              title={r.title}
              meta={r.body}
              actions={
                <DeleteButton id={r.id} action={deleteApproachStep} confirm={`Delete "${r.title}"?`} />
              }
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
