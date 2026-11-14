import { Field, NumberField } from "../_components/ui";
import { FormShell } from "../_cms/cms";
import type { Tables } from "@/lib/supabase/database.types";

export function ClientForm({
  action,
  client,
}: {
  action: (formData: FormData) => void;
  client?: Tables<"clients">;
}) {
  return (
    <FormShell
      action={action}
      cancelHref="/admin/clients"
      submitLabel={client ? "Save changes" : "Create client"}
    >
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      <Field label="Name" name="name" defaultValue={client?.name} required />
      <Field
        label="Slug"
        name="slug"
        defaultValue={client?.slug}
        hint="Leave blank to auto-generate from the name."
      />
      <NumberField
        label="Sort order"
        name="sort_order"
        defaultValue={client?.sort_order ?? 0}
        hint="Lower numbers appear first in the Production Clients marquee."
      />
    </FormShell>
  );
}
