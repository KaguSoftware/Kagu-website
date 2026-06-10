"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { flash } from "./flash";
import { withFlash } from "./with-flash";

/*
  Learnings: internal team knowledge base. Internal-only — no revalidatePublic().
  Any authenticated user can create, edit, or delete any entry (no roles).
*/

const Schema = z.object({
  title: z.string().min(1, { error: "Title is required." }).trim(),
  summary: z.string().trim().optional(),
  body: z.string(),
  tags: z.string().optional(),
});

function parse(formData: FormData) {
  const d = Schema.parse({
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    body: formData.get("body") ?? "",
    tags: formData.get("tags") || undefined,
  });
  const tags = Array.from(
    new Set(
      (d.tags ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  return { title: d.title, summary: d.summary ?? "", body: d.body, tags };
}

function authorOf(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return {
    author_email: user.email ?? "unknown",
    author_name: typeof name === "string" && name ? name : null,
  };
}

export const createLearning = withFlash(async (formData: FormData) => {
  const user = await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db
    .from("learnings")
    .insert({ ...parse(formData), ...authorOf(user) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/learnings");
  await flash("success", "Learning published.");
  redirect(`/admin/learnings/${data.id}`);
});

export const updateLearning = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db
    .from("learnings")
    .update({ ...parse(formData), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/learnings");
  revalidatePath(`/admin/learnings/${id}`);
  await flash("success", "Learning saved.");
  redirect(`/admin/learnings/${id}`);
});

export const deleteLearning = withFlash(async (formData: FormData) => {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  const { error } = await db.from("learnings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/learnings");
  await flash("success", "Learning deleted.");
  redirect("/admin/learnings");
});

/*
  Image upload for the markdown editor (paste / drag-drop). Returns JSON to the
  caller instead of redirecting, so it is NOT wrapped in withFlash — the editor
  shows errors itself via the toast system.
*/

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadLearningImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file received." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Only PNG, JPEG, WebP, or GIF images are allowed." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image is too large (max 5 MB)." };

  const db = createAdminClient();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from("learning-images")
    .upload(path, file, { contentType: file.type });
  if (error) return { error: error.message };

  return { url: db.storage.from("learning-images").getPublicUrl(path).data.publicUrl };
}
