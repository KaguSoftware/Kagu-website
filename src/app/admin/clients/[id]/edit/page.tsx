import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { ClientForm } from "../../ClientForm";
import { updateClientRecord } from "../../../_actions/clients";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit client" description={client.name} />
      <ClientForm action={updateClientRecord} client={client} />
    </div>
  );
}
