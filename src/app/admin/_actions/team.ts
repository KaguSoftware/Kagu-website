"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePublic } from "./revalidate";
import { flash } from "./flash";
import { withFlash } from "./with-flash";

const Schema = z.object({
  name: z.string().min(1, { error: "Name is required." }).trim(),
  role: z.string().min(1, { error: "Role is required." }).trim(),
  bio: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  segment: z
    .enum(["cofounder", "senior_associate", "associate"])
    .default("associate"),
  sort_order: z.coerce.number().int().default(0),
});

function parse(formData: FormData) {
  const d = Schema.parse({
    name: formData.get("name"),
    role: formData.get("role"),
    bio: formData.get("bio") || undefined,
    image_url: formData.get("image_url") || undefined,
    segment: formData.get("segment") || "associate",
    sort_order: formData.get("sort_order") || 0,
  });
  return {
    name: d.name,
    role: d.role,
    bio: d.bio ?? null,
    image_url: d.image_url ?? null,
    segment: d.segment,
    sort_order: d.sort_order,
  };
}

export const createTeamMember = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("team_members").insert(parse(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
  revalidatePublic();
  await flash("success", "Team member added.");
  redirect("/admin/team");
});

export const updateTeamMember = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db
    .from("team_members")
    .update(parse(formData))
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
  revalidatePublic();
  await flash("success", "Team member saved.");
  redirect("/admin/team");
});

export const deleteTeamMember = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/team");
  revalidatePublic();
  await flash("success", "Team member deleted.");
});
