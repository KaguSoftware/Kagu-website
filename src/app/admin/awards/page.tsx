import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteAward } from "../_actions/awards";
import { RowList, Row } from "../_cms/cms";

export default async function AwardsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("awards").select("*").order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Awards"
        description="Accolades shown on the homepage. The public section shows the honest 'No awards. Yet.' fallback while this is empty."
        action={
          <ButtonLink href="/admin/awards/new" variant="solid">
            + New award
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No awards yet — the public site shows the honest fallback.</EmptyState>
      ) : (
        <RowList>
          {rows.map((r) => (
            <Row
              key={r.id}
              href={`/admin/awards/${r.id}/edit`}
              title={r.title}
              meta={[r.year, r.issuer].filter(Boolean).join(" · ") || "—"}
              actions={<DeleteButton id={r.id} action={deleteAward} confirm={`Delete "${r.title}"?`} />}
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
