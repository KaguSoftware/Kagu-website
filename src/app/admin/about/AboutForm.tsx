import { Field, TextArea, Select, NumberField } from "../_components/ui";
import { FormShell } from "../_cms/cms";
import type { Tables } from "@/lib/supabase/database.types";

const KINDS = [
  { value: "mission", label: "Mission (body)" },
  { value: "paragraph", label: "Paragraph (body)" },
  { value: "principle", label: "Principle (title + body)" },
  { value: "metric", label: "Metric (title + value)" },
];

export function AboutForm({
  action,
  block,
}: {
  action: (formData: FormData) => void;
  block?: Tables<"about_blocks">;
}) {
  return (
    <FormShell
      action={action}
      cancelHref="/admin/about"
      submitLabel={block ? "Save changes" : "Create block"}
    >
      {block ? <input type="hidden" name="id" value={block.id} /> : null}
      <Select
        label="Kind"
        name="kind"
        defaultValue={block?.kind ?? "paragraph"}
        options={KINDS}
        required
      />
      <Field
        label="Title"
        name="title"
        defaultValue={block?.title}
        hint="Used by Principle and Metric (the metric's label)."
      />
      <TextArea
        label="Body"
        name="body"
        defaultValue={block?.body}
        rows={4}
        hint="Used by Mission, Paragraph, and Principle."
      />
      <Field
        label="Value"
        name="value"
        defaultValue={block?.value}
        hint="Used by Metric (the metric's value)."
      />
      <NumberField label="Sort order" name="sort_order" defaultValue={block?.sort_order ?? 0} />
    </FormShell>
  );
}
