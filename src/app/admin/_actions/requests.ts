"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InquiryStatus } from "@/lib/supabase/database.types";
import { withResult } from "./action-result";

/* /admin/requests unifies two intake tables; the table name rides along so a
   single action serves both row kinds. */
export type RequestTable = "contact_requests" | "project_inquiries";

const RequestTableSchema = z.enum(["contact_requests", "project_inquiries"]);
const RequestStatusSchema = z.enum(["new", "contacted", "archived"]);

export const updateRequestStatus = withResult(
  async (table: RequestTable, id: string, status: InquiryStatus) => {
    await requireAdmin();
    const target = RequestTableSchema.parse(table);
    const rowId = z.uuid().parse(id);
    const next = RequestStatusSchema.parse(status);
    const db = createAdminClient();
    const { error } = await db
      .from(target)
      .update({ status: next })
      .eq("id", rowId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/requests");
  }
);
