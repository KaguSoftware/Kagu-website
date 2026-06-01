import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../_components/ui";
import { ProjectForm } from "../ProjectForm";
import { createProject } from "../../_actions/projects";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("name").order("name");

  return (
    <div className="space-y-8">
      <PageHeader title="New project" />
      <ProjectForm action={createProject} clients={clients ?? []} />
    </div>
  );
}
