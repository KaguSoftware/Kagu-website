import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { TeamMemberForm } from "../../TeamMemberForm";
import { updateTeamMember } from "../../../_actions/team";

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .single();

  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit team member" description={row.name} />
      <TeamMemberForm action={updateTeamMember} member={row} />
    </div>
  );
}
