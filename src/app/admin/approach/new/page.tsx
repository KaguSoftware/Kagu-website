import { PageHeader } from "../../_components/ui";
import { ApproachForm } from "../ApproachForm";
import { createApproachStep } from "../../_actions/approach";

export default function NewApproachPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New approach step" />
      <ApproachForm action={createApproachStep} />
    </div>
  );
}
