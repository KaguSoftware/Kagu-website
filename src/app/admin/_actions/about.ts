"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePublic } from "./revalidate";

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

export async function createAboutBlock(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("about_blocks").insert(parse(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/about");
  revalidatePublic();
  redirect("/admin/about");
}

export async function updateAboutBlock(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("about_blocks").update(parse(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/about");
  revalidatePublic();
  redirect("/admin/about");
}

export async function deleteAboutBlock(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("about_blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/about");
  revalidatePublic();
}
