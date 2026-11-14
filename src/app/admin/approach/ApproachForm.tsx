import { Field, TextArea, NumberField } from "../_components/ui";
import { FormShell } from "../_cms/cms";
import type { Tables } from "@/lib/supabase/database.types";

export function ApproachForm({
  action,
  step,
}: {
  action: (formData: FormData) => void;
  step?: Tables<"approach_steps">;
}) {
  return (
    <FormShell
      action={action}
      cancelHref="/admin/approach"
      submitLabel={step ? "Save changes" : "Create step"}
    >
      {step ? <input type="hidden" name="id" value={step.id} /> : null}
      <Field label="Number" name="number" defaultValue={step?.number} required placeholder="01" />
      <Field label="Title" name="title" defaultValue={step?.title} required />
      <TextArea label="Body" name="body" defaultValue={step?.body} required rows={4} />
      <NumberField label="Sort order" name="sort_order" defaultValue={step?.sort_order ?? 0} />
    </FormShell>
  );
}
