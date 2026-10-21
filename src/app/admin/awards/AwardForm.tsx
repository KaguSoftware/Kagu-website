import { Field, NumberField } from "../_components/ui";
import { FormShell } from "../_cms/cms";
import type { Tables } from "@/lib/supabase/database.types";

export function AwardForm({
  action,
  award,
}: {
  action: (formData: FormData) => void;
  award?: Tables<"awards">;
}) {
  return (
    <FormShell
      action={action}
      cancelHref="/admin/awards"
      submitLabel={award ? "Save changes" : "Create award"}
    >
      {award ? <input type="hidden" name="id" value={award.id} /> : null}
      <Field label="Title" name="title" defaultValue={award?.title} required />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Year" name="year" defaultValue={award?.year} />
        <Field label="Issuer" name="issuer" defaultValue={award?.issuer} />
      </div>
      <Field label="URL" name="url" defaultValue={award?.url} placeholder="https://…" />
      <NumberField label="Sort order" name="sort_order" defaultValue={award?.sort_order ?? 0} />
    </FormShell>
  );
}
