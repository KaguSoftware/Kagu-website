"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { revalidatePublic } from "./revalidate";

const Schema = z.object({
  title: z.string().min(1, { error: "Title is required." }).trim(),
  body: z.string().min(1, { error: "Body is required." }).trim(),
  slug: z.string().trim().optional(),
  detail: z.string().optional(),
  sort_order: z.coerce.number().int().default(0),
});

function parse(formData: FormData) {
  const data = Schema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
    slug: formData.get("slug") || undefined,
    detail: formData.get("detail") || "",
    sort_order: formData.get("sort_order") || 0,
  });
  return {
    title: data.title,
    body: data.body,
    slug: data.slug || slugify(data.title),
    detail: (data.detail ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    sort_order: data.sort_order,
  };
}

export async function createCapability(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("capabilities").insert(parse(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/capabilities");
  revalidatePublic();
  redirect("/admin/capabilities");
}

export async function updateCapability(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("capabilities").update(parse(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/capabilities");
  revalidatePublic();
  redirect("/admin/capabilities");
}

export async function deleteCapability(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("capabilities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/capabilities");
  revalidatePublic();
}
