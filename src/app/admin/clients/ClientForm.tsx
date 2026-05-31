import { Field } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
import { ButtonLink } from "../_components/ui";
import type { Tables } from "@/lib/supabase/database.types";

export function ClientForm({
  action,
  client,
}: {
  action: (formData: FormData) => void;
  client?: Tables<"clients">;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      <Field label="Name" name="name" defaultValue={client?.name} required />
      <Field
        label="Slug"
        name="slug"
        defaultValue={client?.slug}
        hint="Leave blank to auto-generate from the name."
      />
      <Field
        label="Sort order"
        name="sort_order"
        type="number"
        defaultValue={client?.sort_order ?? 0}
        hint="Lower numbers appear first in the Production Clients marquee."
      />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{client ? "Save changes" : "Create client"}</SubmitButton>
        <ButtonLink href="/admin/clients">Cancel</ButtonLink>
      </div>
    </form>
  );
}
