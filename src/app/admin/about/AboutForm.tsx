import { Field, TextArea, Select, ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
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
    <form action={action} className="max-w-xl space-y-6">
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
      <Field
        label="Sort order"
        name="sort_order"
        type="number"
        defaultValue={block?.sort_order ?? 0}
      />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{block ? "Save changes" : "Create block"}</SubmitButton>
        <ButtonLink href="/admin/about">Cancel</ButtonLink>
      </div>
    </form>
  );
}
