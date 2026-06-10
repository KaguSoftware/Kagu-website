"use client";

/*
  Leads table: row selection for bulk actions, click-to-open drawer, and a
  light realtime touch — any change to the leads table triggers a debounced
  router.refresh() so new rows appear during a scrape without trying to patch
  a filtered/paginated server-rendered list client-side.
*/

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { EmptyState } from "../../_components/ui";
import {
  AUDIT_FLAG_LABELS,
  PIPELINE_STATUS_CLASSES,
  PIPELINE_STATUS_LABELS,
} from "../_lib/constants";
import { BulkBar } from "./BulkBar";
import { LeadDrawer } from "./LeadDrawer";

type Lead = Tables<"leads">;

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 70
      ? "border-[#3fb27f] text-[#3fb27f]"
      : score >= 40
        ? "border-[#d9a13b] text-[#d9a13b]"
        : "border-neutral text-slate-ink";
  return (
    <span
      className={`inline-block min-w-9 border px-1.5 py-0.5 text-center text-xs font-mono ${tone}`}
    >
      {score}
    </span>
  );
}

export function LeadsTable({
  leads,
  totalCount,
}: {
  leads: Lead[];
  totalCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  // Debounced refresh on any leads change (worker inserting during a run).
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-leads-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(() => router.refresh(), 1500);
        }
      )
      .subscribe();
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Drop selections that fell out of the current page after a refresh.
  const pageIds = new Set(leads.map((l) => l.id));
  const visibleSelected = [...selected].filter((id) => pageIds.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(
      visibleSelected.length === leads.length
        ? new Set()
        : new Set(leads.map((l) => l.id))
    );

  const openLead = leads.find((l) => l.id === openLeadId) ?? null;

  if (leads.length === 0) {
    return (
      <EmptyState>
        No leads match. Run a scrape job or loosen the filters.
      </EmptyState>
    );
  }

  return (
    <div>
      <p className="pb-2 text-xs text-slate-ink">{totalCount} leads</p>
      <div className="overflow-x-auto border border-neutral">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={visibleSelected.length === leads.length}
                  onChange={toggleAll}
                  className="size-4 accent-mint-deep"
                />
              </th>
              <th className="eyebrow px-4 py-3 font-normal">Business</th>
              <th className="eyebrow px-4 py-3 font-normal">Score</th>
              <th className="eyebrow px-4 py-3 font-normal">Flags</th>
              <th className="eyebrow px-4 py-3 font-normal">Rating</th>
              <th className="eyebrow px-4 py-3 font-normal">Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setOpenLeadId(lead.id)}
                className="cursor-pointer border-b border-neutral transition-colors last:border-0 hover:bg-mint-pale"
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${lead.name}`}
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                    className="size-4 accent-mint-deep"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-ink">{lead.name}</span>
                  <p className="text-xs text-slate-ink">
                    {[lead.category, lead.district].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <ScorePill score={lead.lead_score} />
                </td>
                <td className="max-w-56 px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {lead.audit_flags.slice(0, 3).map((flag) => (
                      <span
                        key={flag}
                        className="border border-neutral px-1.5 py-0.5 text-[10px] text-slate-ink"
                      >
                        {AUDIT_FLAG_LABELS[flag]}
                      </span>
                    ))}
                    {lead.audit_flags.length > 3 && (
                      <span className="text-[10px] text-slate-ink">
                        +{lead.audit_flags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-ink">
                  {lead.rating != null
                    ? `${lead.rating} (${lead.review_count ?? 0})`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${PIPELINE_STATUS_CLASSES[lead.pipeline_status]}`}
                  >
                    {PIPELINE_STATUS_LABELS[lead.pipeline_status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkBar
        selectedIds={visibleSelected}
        onDone={() => setSelected(new Set())}
      />
      <LeadDrawer lead={openLead} onClose={() => setOpenLeadId(null)} />
    </div>
  );
}
