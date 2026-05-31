import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { ApproachForm } from "../../ApproachForm";
import { updateApproachStep } from "../../../_actions/approach";

export default async function EditApproachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("approach_steps")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit approach step" description={row.title} />
      <ApproachForm action={updateApproachStep} step={row} />
    </div>
  );
}
