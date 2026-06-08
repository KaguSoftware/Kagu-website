"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { revalidatePublic } from "./revalidate";
import { flash } from "./flash";
import { withFlash } from "./with-flash";

const ClientSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }).trim(),
  slug: z.string().trim().optional(),
  sort_order: z.coerce.number().int().default(0),
});

function parse(formData: FormData) {
  return ClientSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    sort_order: formData.get("sort_order") || 0,
  });
}

export const createClientRecord = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const data = parse(formData);
  const db = createAdminClient();
  const { error } = await db.from("clients").insert({
    name: data.name,
    slug: data.slug || slugify(data.name),
    sort_order: data.sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clients");
  revalidatePublic();
  await flash("success", `“${data.name}” added.`);
  redirect("/admin/clients");
});

export const updateClientRecord = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const data = parse(formData);
  const db = createAdminClient();
  const { error } = await db
    .from("clients")
    .update({
      name: data.name,
      slug: data.slug || slugify(data.name),
      sort_order: data.sort_order,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clients");
  revalidatePublic();
  await flash("success", `“${data.name}” saved.`);
  redirect("/admin/clients");
});

export const deleteClientRecord = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("clients").delete().eq("id", id);
  if (error) {
    // FK violation: client still linked to a project.
    throw new Error(
      "Can't delete this client — it's still linked to a project. Reassign or delete that project first."
    );
  }
  revalidatePath("/admin/clients");
  revalidatePublic();
  await flash("success", "Client deleted.");
});
