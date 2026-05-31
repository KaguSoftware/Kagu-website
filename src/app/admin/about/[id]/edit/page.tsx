import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { AboutForm } from "../../AboutForm";
import { updateAboutBlock } from "../../../_actions/about";

export default async function EditAboutBlockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("about_blocks")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit about block" description={row.kind} />
      <AboutForm action={updateAboutBlock} block={row} />
    </div>
  );
}
