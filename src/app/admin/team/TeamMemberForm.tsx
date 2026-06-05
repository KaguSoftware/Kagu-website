import { Field, TextArea, Select, ButtonLink } from "../_components/ui";
import { SubmitButton } from "../_components/SubmitButton";
import type { Tables } from "@/lib/supabase/database.types";

export function TeamMemberForm({
  action,
  member,
}: {
  action: (formData: FormData) => void;
  member?: Tables<"team_members">;
}) {
  return (
    <form action={action} className="max-w-xl space-y-6">
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
      <Select
        label="Segment"
        name="segment"
        defaultValue={member?.segment ?? "associate"}
        options={[
          { value: "cofounder", label: "Cofounder" },
          { value: "associate", label: "Associate" },
        ]}
      />
      <Field
        label="Sort order"
        name="sort_order"
        type="number"
        defaultValue={member?.sort_order ?? 0}
      />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton>{member ? "Save changes" : "Create"}</SubmitButton>
        <ButtonLink href="/admin/team">Cancel</ButtonLink>
      </div>
    </form>
  );
}
