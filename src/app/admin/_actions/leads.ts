"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PipelineStatus } from "@/lib/supabase/database.types";
import { withResult } from "./action-result";

const PipelineStatusSchema = z.enum([
  "new",
  "queued",
  "contacted",
  "replied",
  "meeting",
  "won",
  "lost",
  "do_not_contact",
]);

export const updateLeadPipelineStatus = withResult(
  async (id: string, status: PipelineStatus) => {
    await requireAdmin();
    const leadId = z.uuid().parse(id);
    const next = PipelineStatusSchema.parse(status);
    const db = createAdminClient();

    // Stamp contacted_at the first time a lead reaches `contacted`.
    let contactedAt: string | null | undefined;
    if (next === "contacted") {
      const { data: existing } = await db
        .from("leads")
        .select("contacted_at")
        .eq("id", leadId)
        .maybeSingle();
      if (!existing?.contacted_at) contactedAt = new Date().toISOString();
    }

    const { error } = await db
      .from("leads")
      .update({
        pipeline_status: next,
        updated_at: new Date().toISOString(),
        ...(contactedAt !== undefined ? { contacted_at: contactedAt } : {}),
      })
      .eq("id", leadId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads", "layout");
  }
);

export const updateLeadNotes = withResult(async (id: string, notes: string) => {
  await requireAdmin();
  const leadId = z.uuid().parse(id);
  const text = z.string().max(5000).parse(notes);
  const db = createAdminClient();
  const { error } = await db
    .from("leads")
    .update({ notes: text || null, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads", "layout");
});

export const bulkUpdateLeadStatus = withResult(
  async (ids: string[], status: PipelineStatus) => {
    await requireAdmin();
    const leadIds = z.array(z.uuid()).min(1).max(50).parse(ids);
    const next = PipelineStatusSchema.parse(status);
    const db = createAdminClient();
    const { error } = await db
      .from("leads")
      .update({ pipeline_status: next, updated_at: new Date().toISOString() })
      .in("id", leadIds);
    if (error) throw new Error(error.message);

    // Stamp contacted_at only for leads that were never contacted before.
    if (next === "contacted") {
      const { error: stampError } = await db
        .from("leads")
        .update({ contacted_at: new Date().toISOString() })
        .in("id", leadIds)
        .is("contacted_at", null);
      if (stampError) throw new Error(stampError.message);
    }
    revalidatePath("/admin/leads", "layout");
  }
);
