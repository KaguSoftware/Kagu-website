import { PageHeader } from "../../_components/ui";
import { LearningForm } from "../_components/LearningForm";
import { createLearning } from "../../_actions/learnings";

export const metadata = { title: "New learning" };

export default function NewLearningPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="New learning"
        description="Write it the way you wish someone had written it for you — context, steps, screenshots, links."
      />
      <LearningForm action={createLearning} />
    </div>
  );
}
