"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { revalidatePublic } from "./revalidate";

const FeatureSchema = z.object({
  image: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  device: z.enum(["desktop", "mobile"]).nullable().optional(),
});

const ProjectSchema = z.object({
  client_name: z.string().min(1, { error: "Client is required." }).trim(),
  slug: z.string().trim().optional(),
  project: z.string().min(1, { error: "Project title is required." }).trim(),
  sector: z.string().trim().optional(),
  year: z.string().trim().optional(),
  role: z.string().trim().optional(),
  stack: z.string().optional(),
  url: z.string().trim().optional(),
  lede: z.string().trim().optional(),
  body: z.string().optional(),
  cover_bg: z.enum(["mint-pale", "mint-soft", "mint-deep", "slate-ink", "paper"]),
  cover_label: z.string().min(1, { error: "Cover label is required." }).trim(),
  thumbnail: z.string().trim().optional(),
  device: z.enum(["desktop", "mobile"]).optional(),
  is_featured: z.boolean().default(false),
  featured_order: z.coerce.number().int().optional(),
  sort_order: z.coerce.number().int().default(0),
  is_published: z.boolean().default(true),
  features: z.string().optional(),
});

function lines(v?: string) {
  return (v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
}

function parse(formData: FormData) {
  const d = ProjectSchema.parse({
    client_name: formData.get("client_name"),
    slug: formData.get("slug") || undefined,
    project: formData.get("project"),
    sector: formData.get("sector") || undefined,
    year: formData.get("year") || undefined,
    role: formData.get("role") || undefined,
    stack: formData.get("stack") || "",
    url: formData.get("url") || undefined,
    lede: formData.get("lede") || undefined,
    body: formData.get("body") || "",
    cover_bg: formData.get("cover_bg"),
    cover_label: formData.get("cover_label"),
    thumbnail: formData.get("thumbnail") || undefined,
    device: formData.get("device") || undefined,
    is_featured: formData.get("is_featured") === "on",
    featured_order: formData.get("featured_order") || undefined,
    sort_order: formData.get("sort_order") || 0,
    is_published: formData.get("is_published") === "on",
    features: formData.get("features") || "[]",
  });

  let features: z.infer<typeof FeatureSchema>[] = [];
  try {
    features = z.array(FeatureSchema).parse(JSON.parse(d.features ?? "[]"));
  } catch {
    features = [];
  }

  return { d, features };
}

/** Resolve a client by name, creating it if new (Module 7 auto-create). */
async function resolveClientId(
  db: ReturnType<typeof createAdminClient>,
  name: string
): Promise<string> {
  const { data: existing } = await db
    .from("clients")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await db
    .from("clients")
    .insert({ name, slug: slugify(name) })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Failed to create client.");
  return created.id;
}

export async function createProject(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { d, features } = parse(formData);

  const client_id = await resolveClientId(db, d.client_name);
  const slug = d.slug || slugify(d.project);

  const { data: project, error } = await db
    .from("projects")
    .insert({
      client_id,
      slug,
      project: d.project,
      sector: d.sector ?? null,
      year: d.year ?? null,
      role: d.role ?? null,
      stack: lines(d.stack),
      url: d.url ?? null,
      lede: d.lede ?? null,
      body: lines(d.body),
      cover_bg: d.cover_bg,
      cover_label: d.cover_label,
      thumbnail: d.thumbnail ?? null,
      device: d.device ?? null,
      is_featured: d.is_featured,
      featured_order: d.featured_order ?? null,
      sort_order: d.sort_order,
      is_published: d.is_published,
    })
    .select("id")
    .single();

  if (error || !project) throw new Error(error?.message ?? "Failed to create project.");

  if (features.length) {
    await db.from("project_features").insert(
      features.map((f, i) => ({
        project_id: project.id,
        image: f.image,
        title: f.title,
        description: f.description,
        device: f.device ?? null,
        sort_order: i,
      }))
    );
  }

  revalidatePath("/admin/projects");
  revalidatePublic();
  redirect("/admin/projects");
}

export async function updateProject(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  const { d, features } = parse(formData);

  const client_id = await resolveClientId(db, d.client_name);
  const slug = d.slug || slugify(d.project);

  const { error } = await db
    .from("projects")
    .update({
      client_id,
      slug,
      project: d.project,
      sector: d.sector ?? null,
      year: d.year ?? null,
      role: d.role ?? null,
      stack: lines(d.stack),
      url: d.url ?? null,
      lede: d.lede ?? null,
      body: lines(d.body),
      cover_bg: d.cover_bg,
      cover_label: d.cover_label,
      thumbnail: d.thumbnail ?? null,
      device: d.device ?? null,
      is_featured: d.is_featured,
      featured_order: d.featured_order ?? null,
      sort_order: d.sort_order,
      is_published: d.is_published,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Replace feature subrows wholesale (simplest correct strategy).
  await db.from("project_features").delete().eq("project_id", id);
  if (features.length) {
    await db.from("project_features").insert(
      features.map((f, i) => ({
        project_id: id,
        image: f.image,
        title: f.title,
        description: f.description,
        device: f.device ?? null,
        sort_order: i,
      }))
    );
  }

  revalidatePath("/admin/projects");
  revalidatePublic();
  redirect("/admin/projects");
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const db = createAdminClient();
  // project_features cascade on delete; the client row is left intact.
  const { error } = await db.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/projects");
  revalidatePublic();
}
