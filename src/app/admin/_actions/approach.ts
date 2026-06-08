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
  number: z.string().min(1, { error: "Number is required." }).trim(),
  title: z.string().min(1, { error: "Title is required." }).trim(),
  body: z.string().min(1, { error: "Body is required." }).trim(),
  sort_order: z.coerce.number().int().default(0),
});

function parse(formData: FormData) {
  return Schema.parse({
    number: formData.get("number"),
    title: formData.get("title"),
    body: formData.get("body"),
    sort_order: formData.get("sort_order") || 0,
  });
}

export const createApproachStep = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("approach_steps").insert(parse(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approach");
  revalidatePublic();
  await flash("success", "Approach step added.");
  redirect("/admin/approach");
});

export const updateApproachStep = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("approach_steps").update(parse(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approach");
  revalidatePublic();
  await flash("success", "Approach step saved.");
  redirect("/admin/approach");
});

export const deleteApproachStep = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("approach_steps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/approach");
  revalidatePublic();
  await flash("success", "Approach step deleted.");
});
