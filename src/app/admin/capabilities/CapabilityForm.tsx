import { Field, TextArea, NumberField } from "../_components/ui";
import { ListField } from "../_components/ListField";
import { FormShell } from "../_cms/cms";
import type { Tables } from "@/lib/supabase/database.types";

export function CapabilityForm({
  action,
  capability,
}: {
  action: (formData: FormData) => void;
  capability?: Tables<"capabilities">;
}) {
  return (
    <FormShell
      action={action}
      cancelHref="/admin/capabilities"
      submitLabel={capability ? "Save changes" : "Create"}
    >
      {capability ? <input type="hidden" name="id" value={capability.id} /> : null}
      <Field label="Title" name="title" defaultValue={capability?.title} required />
      <TextArea label="Body" name="body" defaultValue={capability?.body} required rows={4} />
      <ListField
        label="Detail bullets"
        name="detail"
        defaultValue={capability?.detail ?? []}
        hint="One bullet per row."
      />
      <Field
        label="Slug"
        name="slug"
        defaultValue={capability?.slug}
        hint="Leave blank to auto-generate."
      />
      <NumberField label="Sort order" name="sort_order" defaultValue={capability?.sort_order ?? 0} />
    </FormShell>
  );
}
