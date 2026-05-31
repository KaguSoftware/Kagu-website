import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { AwardForm } from "../../AwardForm";
import { updateAward } from "../../../_actions/awards";

export default async function EditAwardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase.from("awards").select("*").eq("id", id).single();
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit award" description={row.title} />
      <AwardForm action={updateAward} award={row} />
    </div>
  );
}
