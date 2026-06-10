"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { withResult } from "./action-result";

/* Lazy read for the lead drawer's Messages panel. */
export const getLeadMessages = withResult(
  async (leadId: string): Promise<Tables<"lead_messages">[]> => {
    await requireAdmin();
    const id = z.uuid().parse(leadId);
    const db = createAdminClient();
    const { data, error } = await db
      .from("lead_messages")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }
);

export const updateMessageContent = withResult(
  async (id: string, content: { subject: string | null; body: string }) => {
    await requireAdmin();
    const messageId = z.uuid().parse(id);
    const { subject, body } = z
      .object({
        subject: z.string().max(300).nullable(),
        body: z.string().min(1, { error: "Body is required." }).max(5000),
      })
      .parse(content);
    const db = createAdminClient();
    const { error } = await db
      .from("lead_messages")
      .update({
        subject: subject || null,
        body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/leads", "layout");
  }
);

async function setMessageStatus(id: string, status: "approved" | "rejected") {
  await requireAdmin();
  const messageId = z.uuid().parse(id);
  const db = createAdminClient();
  const { error } = await db
    .from("lead_messages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads", "layout");
}

export const approveMessage = withResult(async (id: string) => {
  await setMessageStatus(id, "approved");
});

export const rejectMessage = withResult(async (id: string) => {
  await setMessageStatus(id, "rejected");
});

/* Marking a message sent also moves its lead to `contacted` in the pipeline. */
export const markMessageSent = withResult(async (id: string) => {
  await requireAdmin();
  const messageId = z.uuid().parse(id);
  const db = createAdminClient();
  const now = new Date().toISOString();

  const { data: message, error } = await db
    .from("lead_messages")
    .update({ status: "sent", updated_at: now })
    .eq("id", messageId)
    .select("lead_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!message) throw new Error("Message not found.");

  const { error: leadError } = await db
    .from("leads")
    .update({ pipeline_status: "contacted", contacted_at: now, updated_at: now })
    .eq("id", message.lead_id);
  if (leadError) throw new Error(leadError.message);
  revalidatePath("/admin/leads", "layout");
});
