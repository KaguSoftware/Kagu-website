import { PageHeader } from "../../_components/ui";
import { TeamMemberForm } from "../TeamMemberForm";
import { createTeamMember } from "../../_actions/team";

export default function NewTeamMemberPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New team member" />
      <TeamMemberForm action={createTeamMember} />
    </div>
  );
}
