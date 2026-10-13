import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../../_components/ui";
import { ProjectForm } from "../../ProjectForm";
import { updateProject } from "../../../_actions/projects";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients(name), project_features(*)")
      .eq("id", id)
      .single(),
    supabase.from("clients").select("name").order("name"),
  ]);

  if (!project) notFound();

  const features = (project.project_features ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f) => ({
      image: f.image,
      title: f.title,
      description: f.description,
      alt: f.alt ?? "",
      device: f.device,
    }));

  return (
    <div className="space-y-8">
      <PageHeader title="Edit project" description={project.project} />
      <ProjectForm
        action={updateProject}
        project={project}
        clientName={project.clients?.name}
        clients={clients ?? []}
        features={features}
      />
    </div>
  );
}
