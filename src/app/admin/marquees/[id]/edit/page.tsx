import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { StackTokenForm } from "../../StackTokenForm";
import { updateStackToken } from "../../../_actions/stack-tokens";

export default async function EditStackTokenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("stack_tokens")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader title="Edit marquee item" description={row.label} />
      <StackTokenForm action={updateStackToken} token={row} />
    </div>
  );
}
