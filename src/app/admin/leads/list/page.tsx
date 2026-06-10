import { createClient } from "@/lib/supabase/server";
import type {
  AuditFlag,
  PipelineStatus,
  Tables,
} from "@/lib/supabase/database.types";
import {
  AUDIT_FLAGS,
  LEADS_PAGE_SIZE,
  PIPELINE_STATUSES,
} from "../_lib/constants";
import { LeadFilters } from "../_components/LeadFilters";
import { LeadsTable } from "../_components/LeadsTable";
import { PaginationNav } from "../_components/PaginationNav";

export const metadata = { title: "Leads list" };

export type LeadsListParams = {
  district?: string;
  category?: string;
  status?: string;
  flag?: string;
  minScore?: string;
  sort?: string;
  page?: string;
};

const SORTS: Record<string, { column: keyof Tables<"leads">; ascending: boolean }> = {
  score: { column: "lead_score", ascending: false },
  newest: { column: "created_at", ascending: false },
  name: { column: "name", ascending: true },
  rating: { column: "rating", ascending: false },
};

export default async function LeadsListPage({
  searchParams,
}: {
  searchParams: Promise<LeadsListParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sort = SORTS[params.sort ?? "score"] ?? SORTS.score;
  const status = PIPELINE_STATUSES.includes(params.status as PipelineStatus)
    ? (params.status as PipelineStatus)
    : undefined;
  const flag = AUDIT_FLAGS.includes(params.flag as AuditFlag)
    ? (params.flag as AuditFlag)
    : undefined;
  const minScore = Number(params.minScore) || 0;

  const supabase = await createClient();
  let query = supabase.from("leads").select("*", { count: "exact" });
  if (params.district) query = query.eq("district", params.district);
  if (params.category) query = query.eq("category", params.category);
  if (status) query = query.eq("pipeline_status", status);
  if (flag) query = query.contains("audit_flags", JSON.stringify([flag]));
  if (minScore > 0) query = query.gte("lead_score", minScore);

  const from = (page - 1) * LEADS_PAGE_SIZE;
  const { data: leads, count } = await query
    .order(sort.column, { ascending: sort.ascending })
    .order("id", { ascending: true })
    .range(from, from + LEADS_PAGE_SIZE - 1);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LEADS_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <LeadFilters params={params} />
      <LeadsTable leads={leads ?? []} totalCount={totalCount} />
      <PaginationNav page={page} totalPages={totalPages} params={params} />
    </div>
  );
}
