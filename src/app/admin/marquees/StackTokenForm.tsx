import { Field, Select, NumberField } from "../_components/ui";
import { FormShell } from "../_cms/cms";
import type { Tables } from "@/lib/supabase/database.types";

const PLACEMENTS = [
  { value: "hero_marquee", label: "Hero marquee" },
  { value: "stack_lineage", label: "Stack lineage" },
];

export function StackTokenForm({
  action,
  token,
  defaultPlacement,
}: {
  action: (formData: FormData) => void;
  token?: Tables<"stack_tokens">;
  defaultPlacement?: string;
}) {
  return (
    <FormShell
      action={action}
      cancelHref="/admin/marquees"
      submitLabel={token ? "Save changes" : "Add item"}
    >
      {token ? <input type="hidden" name="id" value={token.id} /> : null}
      <Field label="Label" name="label" defaultValue={token?.label} required />
      <Select
        label="Placement"
        name="placement"
        defaultValue={token?.placement ?? defaultPlacement ?? "hero_marquee"}
        options={PLACEMENTS}
        required
      />
      <Field
        label="Link (optional)"
        name="href"
        defaultValue={token?.href}
        placeholder="https://…"
        hint="Hero marquee items may link out."
      />
      <NumberField label="Sort order" name="sort_order" defaultValue={token?.sort_order ?? 0} />
    </FormShell>
  );
}
