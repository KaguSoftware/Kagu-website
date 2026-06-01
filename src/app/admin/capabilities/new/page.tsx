import { PageHeader } from "../../_components/ui";
import { CapabilityForm } from "../CapabilityForm";
import { createCapability } from "../../_actions/capabilities";

export default function NewCapabilityPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New capability" />
      <CapabilityForm action={createCapability} />
    </div>
  );
}
