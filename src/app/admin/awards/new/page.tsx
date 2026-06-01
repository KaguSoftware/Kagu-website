import { PageHeader } from "../../_components/ui";
import { AwardForm } from "../AwardForm";
import { createAward } from "../../_actions/awards";

export default function NewAwardPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New award" />
      <AwardForm action={createAward} />
    </div>
  );
}
