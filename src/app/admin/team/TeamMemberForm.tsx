import { Field, TextArea, Select, NumberField } from "../_components/ui";
import { FormShell } from "../_cms/cms";
import type { Tables } from "@/lib/supabase/database.types";

export function TeamMemberForm({
  action,
  member,
}: {
  action: (formData: FormData) => void;
  member?: Tables<"team_members">;
}) {
  return (
    <FormShell
      action={action}
      cancelHref="/admin/team"
      submitLabel={member ? "Save changes" : "Create"}
    >
      {member ? <input type="hidden" name="id" value={member.id} /> : null}
      <Field label="Name" name="name" defaultValue={member?.name} required />
      <Field
        label="Role"
        name="role"
        defaultValue={member?.role}
        required
        hint="e.g. Co-founder · Engineering"
      />
      <TextArea label="Bio" name="bio" defaultValue={member?.bio} rows={4} />
      <Field
        label="Image path"
        name="image_url"
        defaultValue={member?.image_url}
        hint="Square headshot. Add the file to /public/team and use a path like /team/name.jpg. Leave blank to show initials."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Select
          label="Segment"
          name="segment"
          defaultValue={member?.segment ?? "associate"}
          options={[
            { value: "cofounder", label: "Cofounder" },
            { value: "senior_associate", label: "Senior Associate" },
            { value: "associate", label: "Associate" },
          ]}
        />
        <NumberField label="Sort order" name="sort_order" defaultValue={member?.sort_order ?? 0} />
      </div>
    </FormShell>
  );
}
