import { PageHeader } from "../../_components/ui";
import { ClientForm } from "../ClientForm";
import { createClientRecord } from "../../_actions/clients";

export default function NewClientPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New client" />
      <ClientForm action={createClientRecord} />
    </div>
  );
}
