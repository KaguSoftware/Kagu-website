import { PageHeader } from "../../_components/ui";
import { AboutForm } from "../AboutForm";
import { createAboutBlock } from "../../_actions/about";

export default function NewAboutBlockPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="New about block" />
      <AboutForm action={createAboutBlock} />
    </div>
  );
}
