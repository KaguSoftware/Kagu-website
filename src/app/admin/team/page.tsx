import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteTeamMember } from "../_actions/team";

const SEGMENT_LABEL: Record<string, string> = {
  cofounder: "Cofounder",
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
        description="People shown on the public /team page, split into Cofounders and Associates. Drag order is set by 'Sort order'."
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
        <ul className="divide-y divide-neutral border border-neutral">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <Link
                  href={`/admin/team/${r.id}/edit`}
                  className="text-base text-ink transition-colors hover:text-mint-deep"
                >
                  {r.name}
                </Link>
                <p className="font-mono text-xs text-slate-ink">
                  {[SEGMENT_LABEL[r.segment] ?? r.segment, r.role]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/team/${r.id}/edit`}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Edit
                </Link>
                <DeleteButton
                  id={r.id}
                  action={deleteTeamMember}
                  confirm={`Delete "${r.name}"?`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
