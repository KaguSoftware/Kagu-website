import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { CapabilityForm } from "../../CapabilityForm";
import { updateCapability } from "../../../_actions/capabilities";

export default async function EditCapabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("capabilities")
    .select("*")
    .eq("id", id)
    .single();

  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit capability" description={row.title} />
      <CapabilityForm action={updateCapability} capability={row} />
    </div>
  );
}
