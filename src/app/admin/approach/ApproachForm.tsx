import { Field, TextArea, ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
import type { Tables } from "@/lib/supabase/database.types";

export function ApproachForm({
  action,
  step,
}: {
  action: (formData: FormData) => void;
  step?: Tables<"approach_steps">;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      {step ? <input type="hidden" name="id" value={step.id} /> : null}
      <Field label="Number" name="number" defaultValue={step?.number} required placeholder="01" />
      <Field label="Title" name="title" defaultValue={step?.title} required />
      <TextArea label="Body" name="body" defaultValue={step?.body} required rows={4} />
      <Field
        label="Sort order"
        name="sort_order"
        type="number"
        defaultValue={step?.sort_order ?? 0}
      />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{step ? "Save changes" : "Create step"}</SubmitButton>
        <ButtonLink href="/admin/approach">Cancel</ButtonLink>
      </div>
    </form>
  );
}
