"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePublic } from "./revalidate";

const ClockSchema = z.object({
  city: z.string().trim(),
  tz: z.string().trim(),
  utc: z.string().trim(),
});

const Schema = z.object({
  founded: z.string().trim().optional(),
  location: z.string().trim().optional(),
  email: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  clocks: z.string().optional(),
});

export async function updateSettings(formData: FormData) {
  await requireAdmin();

  const d = Schema.parse({
    founded: formData.get("founded") || undefined,
    location: formData.get("location") || undefined,
    email: formData.get("email") || undefined,
    domain: formData.get("domain") || undefined,
    timezone: formData.get("timezone") || undefined,
    clocks: formData.get("clocks") || "[]",
  });

  // clocks arrives as JSON string from the client clock editor.
  let clocks: z.infer<typeof ClockSchema>[] = [];
  try {
    const raw = JSON.parse(d.clocks ?? "[]");
    clocks = z.array(ClockSchema).parse(raw).filter((c) => c.city || c.tz || c.utc);
  } catch {
    clocks = [];
  }

  const db = createAdminClient();
  const { error } = await db
    .from("site_settings")
    .update({
      founded: d.founded ?? null,
      location: d.location ?? null,
      email: d.email ?? null,
      domain: d.domain ?? null,
      timezone: d.timezone ?? null,
      clocks,
    })
    .eq("singleton", true);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePublic();
}
