import { Field, TextArea, Select, Checkbox, ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
import { ListField } from "../_components/ListField";
import { FeatureEditor } from "./FeatureEditor";
import type { Tables } from "@/lib/supabase/database.types";

const COVER_BG = [
  { value: "mint-pale", label: "mint-pale" },
  { value: "mint-soft", label: "mint-soft" },
  { value: "mint-deep", label: "mint-deep" },
  { value: "slate-ink", label: "slate-ink" },
  { value: "paper", label: "paper" },
];

const DEVICE = [
  { value: "", label: "Desktop (default)" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];

type Feature = Pick<Tables<"project_features">, "image" | "title" | "description"> & {
  device: "desktop" | "mobile" | null;
};

export function ProjectForm({
  action,
  project,
  clientName,
  clients,
  features = [],
}: {
  action: (formData: FormData) => void;
  project?: Tables<"projects">;
  clientName?: string;
  clients: { name: string }[];
  features?: Feature[];
}) {
  return (
    <form action={action} className="max-w-2xl space-y-7">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <div className="kagu-field">
        <span className="eyebrow mb-2 block">
          Client<span className="text-mint-deep"> *</span>
        </span>
        <input
          name="client_name"
          list="client-options"
          required
          defaultValue={clientName ?? ""}
          placeholder="Pick existing or type a new client"
          className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none"
        />
        <datalist id="client-options">
          {clients.map((c) => (
            <option key={c.name} value={c.name} />
          ))}
        </datalist>
        <span className="mt-1 block text-xs text-slate-ink">
          A brand-new client is created automatically and added to the Production Clients marquee.
        </span>
      </div>

      <Field label="Project title" name="project" defaultValue={project?.project} required />
      <Field label="Slug" name="slug" defaultValue={project?.slug} hint="Leave blank to auto-generate." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Sector" name="sector" defaultValue={project?.sector} />
        <Field label="Year" name="year" defaultValue={project?.year} />
      </div>

      <Field label="Role" name="role" defaultValue={project?.role} />
      <Field label="URL" name="url" defaultValue={project?.url} placeholder="https://…" />

      <ListField label="Stack" name="stack" defaultValue={project?.stack ?? []} hint="One token per row." />

      <TextArea label="Lede" name="lede" defaultValue={project?.lede} rows={3} />
      <ListField label="Body paragraphs" name="body" defaultValue={project?.body ?? []} hint="One paragraph per row." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Select label="Cover background" name="cover_bg" defaultValue={project?.cover_bg ?? "mint-soft"} options={COVER_BG} required />
        <Field label="Cover label" name="cover_label" defaultValue={project?.cover_label} required />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Thumbnail URL" name="thumbnail" defaultValue={project?.thumbnail} />
        <Select label="Device" name="device" defaultValue={project?.device ?? ""} options={DEVICE} />
      </div>

      <div className="border-t border-neutral pt-6">
        <FeatureEditor defaultValue={features} />
      </div>

      <div className="grid grid-cols-1 gap-6 border-t border-neutral pt-6 sm:grid-cols-2">
        <div className="space-y-4">
          <Checkbox label="Featured (Selected Work)" name="is_featured" defaultChecked={project?.is_featured ?? true} />
          <Checkbox label="Published" name="is_published" defaultChecked={project?.is_published ?? true} />
        </div>
        <div className="space-y-6">
          <Field label="Featured order" name="featured_order" type="number" defaultValue={project?.featured_order ?? 0} />
          <Field label="Sort order (/work)" name="sort_order" type="number" defaultValue={project?.sort_order ?? 0} />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{project ? "Save changes" : "Create project"}</SubmitButton>
        <ButtonLink href="/admin/projects">Cancel</ButtonLink>
      </div>
    </form>
  );
}
