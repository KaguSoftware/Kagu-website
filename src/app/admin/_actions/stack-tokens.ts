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
  label: z.string().min(1, { error: "Label is required." }).trim(),
  href: z.string().trim().optional(),
  placement: z.enum(["hero_marquee", "stack_lineage"]),
  sort_order: z.coerce.number().int().default(0),
});

function parse(formData: FormData) {
  const d = Schema.parse({
    label: formData.get("label"),
    href: formData.get("href") || undefined,
    placement: formData.get("placement"),
    sort_order: formData.get("sort_order") || 0,
  });
  return {
    label: d.label,
    href: d.href ?? null,
    placement: d.placement,
    sort_order: d.sort_order,
  };
}

export const createStackToken = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("stack_tokens").insert(parse(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/marquees");
  revalidatePublic();
  await flash("success", "Marquee token added.");
  redirect("/admin/marquees");
});

export const updateStackToken = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("stack_tokens").update(parse(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/marquees");
  revalidatePublic();
  await flash("success", "Marquee token saved.");
  redirect("/admin/marquees");
});

export const deleteStackToken = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("stack_tokens").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/marquees");
  revalidatePublic();
  await flash("success", "Marquee token deleted.");
});
