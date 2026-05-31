import { Field, TextArea, ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
import { ListField } from "../_components/ListField";
import type { Tables } from "@/lib/supabase/database.types";

export function CapabilityForm({
  action,
  capability,
}: {
  action: (formData: FormData) => void;
  capability?: Tables<"capabilities">;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
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
      <Field
        label="Sort order"
        name="sort_order"
        type="number"
        defaultValue={capability?.sort_order ?? 0}
      />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{capability ? "Save changes" : "Create"}</SubmitButton>
        <ButtonLink href="/admin/capabilities">Cancel</ButtonLink>
      </div>
    </form>
  );
}
