import { Field, Select, ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
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
    <form action={action} className="max-w-xl space-y-6">
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
      <Field
        label="Sort order"
        name="sort_order"
        type="number"
        defaultValue={token?.sort_order ?? 0}
      />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{token ? "Save changes" : "Add item"}</SubmitButton>
        <ButtonLink href="/admin/marquees">Cancel</ButtonLink>
      </div>
    </form>
  );
}
