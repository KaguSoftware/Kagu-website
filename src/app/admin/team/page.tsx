import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteTeamMember } from "../_actions/team";
import { RowList, Row } from "../_cms/cms";

const SEGMENT_LABEL: Record<string, string> = {
  cofounder: "Cofounder",
  senior_associate: "Senior Associate",
  associate: "Associate",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("team_members")
    .select("*")
    .order("segment")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="People shown on the public /team page — Cofounders, Senior Associates and Associates. Order within a segment is set by 'Sort order'."
        action={
          <ButtonLink href="/admin/team/new" variant="solid">
            + New member
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>
          No team members yet — the public /team page stays empty until you add some.
        </EmptyState>
      ) : (
        <RowList>
          {rows.map((r) => (
            <Row
              key={r.id}
              href={`/admin/team/${r.id}/edit`}
              title={r.name}
              meta={[SEGMENT_LABEL[r.segment] ?? r.segment, r.role].filter(Boolean).join(" · ")}
              actions={
                <DeleteButton id={r.id} action={deleteTeamMember} confirm={`Delete "${r.name}"?`} />
              }
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
