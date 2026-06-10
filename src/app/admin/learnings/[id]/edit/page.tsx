import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { LearningForm } from "../../_components/LearningForm";
import { updateLearning } from "../../../_actions/learnings";

export const metadata = { title: "Edit learning" };

export default async function EditLearningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: learning } = await supabase
    .from("learnings")
    .select("*")
    .eq("id", (await params).id)
    .maybeSingle();
  if (!learning) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit learning" />
      <LearningForm action={updateLearning} learning={learning} />
    </div>
  );
}
