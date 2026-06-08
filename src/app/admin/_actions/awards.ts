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
  title: z.string().min(1, { error: "Title is required." }).trim(),
  year: z.string().trim().optional(),
  issuer: z.string().trim().optional(),
  url: z.string().trim().optional(),
  sort_order: z.coerce.number().int().default(0),
});

function parse(formData: FormData) {
  const d = Schema.parse({
    title: formData.get("title"),
    year: formData.get("year") || undefined,
    issuer: formData.get("issuer") || undefined,
    url: formData.get("url") || undefined,
    sort_order: formData.get("sort_order") || 0,
  });
  return {
    title: d.title,
    year: d.year ?? null,
    issuer: d.issuer ?? null,
    url: d.url ?? null,
    sort_order: d.sort_order,
  };
}

export const createAward = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("awards").insert(parse(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/awards");
  revalidatePublic();
  await flash("success", "Award added.");
  redirect("/admin/awards");
});

export const updateAward = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("awards").update(parse(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/awards");
  revalidatePublic();
  await flash("success", "Award saved.");
  redirect("/admin/awards");
});

export const deleteAward = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("awards").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/awards");
  revalidatePublic();
  await flash("success", "Award deleted.");
});
