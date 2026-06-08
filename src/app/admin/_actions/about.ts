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
  kind: z.enum(["mission", "paragraph", "principle", "metric"]),
  title: z.string().trim().optional(),
  body: z.string().trim().optional(),
  value: z.string().trim().optional(),
  sort_order: z.coerce.number().int().default(0),
});

function parse(formData: FormData) {
  const d = Schema.parse({
    kind: formData.get("kind"),
    title: formData.get("title") || undefined,
    body: formData.get("body") || undefined,
    value: formData.get("value") || undefined,
    sort_order: formData.get("sort_order") || 0,
  });
  return {
    kind: d.kind,
    title: d.title ?? null,
    body: d.body ?? null,
    value: d.value ?? null,
    sort_order: d.sort_order,
  };
}

export const createAboutBlock = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("about_blocks").insert(parse(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/about");
  revalidatePublic();
  await flash("success", "About block added.");
  redirect("/admin/about");
});

export const updateAboutBlock = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("about_blocks").update(parse(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/about");
  revalidatePublic();
  await flash("success", "About block saved.");
  redirect("/admin/about");
});

export const deleteAboutBlock = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("about_blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/about");
  revalidatePublic();
  await flash("success", "About block deleted.");
});
