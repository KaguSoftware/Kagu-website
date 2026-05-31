import { Field, ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
import type { Tables } from "@/lib/supabase/database.types";

export function AwardForm({
  action,
  award,
}: {
  action: (formData: FormData) => void;
  award?: Tables<"awards">;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      {award ? <input type="hidden" name="id" value={award.id} /> : null}
      <Field label="Title" name="title" defaultValue={award?.title} required />
      <Field label="Year" name="year" defaultValue={award?.year} />
      <Field label="Issuer" name="issuer" defaultValue={award?.issuer} />
      <Field label="URL" name="url" defaultValue={award?.url} placeholder="https://…" />
      <Field
        label="Sort order"
        name="sort_order"
        type="number"
        defaultValue={award?.sort_order ?? 0}
      />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{award ? "Save changes" : "Create award"}</SubmitButton>
        <ButtonLink href="/admin/awards">Cancel</ButtonLink>
      </div>
    </form>
  );
}
