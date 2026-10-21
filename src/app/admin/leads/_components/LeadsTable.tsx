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
import { LeadCheck } from "./LeadCheck";
import { LeadDrawer } from "./LeadDrawer";

type Lead = Tables<"leads">;

/* Score as number + slim bar (toned by the same 70 / 40 thresholds as before). */
function ScoreCell({ score }: { score: number }) {
  const tone = score >= 70 ? "ok" : score >= 40 ? "warn" : "muted";
  return (
    <div className="ld-meter-row">
      <span className="w-7 text-right font-medium text-ink">{score}</span>
      <span
        className="ld-meter"
        data-tone={tone}
        role="img"
        aria-label={`Lead score ${score} of 100`}
        style={{ maxWidth: 64 }}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </span>
    </div>
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
      <p className="ld-small ld-num pb-3">{totalCount.toLocaleString("en-US")} leads</p>
      <div className="ld-wrap ld-wrap--tall">
        <table className="ld-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>
                <LeadCheck
                  label="Select all on page"
                  checked={visibleSelected.length === leads.length}
                  indeterminate={
                    visibleSelected.length > 0 && visibleSelected.length < leads.length
                  }
                  onChange={toggleAll}
                />
              </th>
              <th>Business</th>
              <th>Score</th>
              <th>Flags</th>
              <th>Rating</th>
              <th>Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setOpenLeadId(lead.id)}
                data-click
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <LeadCheck
                    label={`Select ${lead.name}`}
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                  />
                </td>
                <td>
                  <span className="font-medium text-ink">{lead.name}</span>
                  <p className="ld-small">
                    {[lead.category, lead.district].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td>
                  <ScoreCell score={lead.lead_score} />
                </td>
                <td className="max-w-64">
                  <div className="ld-chips">
                    {lead.audit_flags.slice(0, 3).map((flag) => (
                      <span key={flag} className="ld-tag ld-tag--quiet">
                        {AUDIT_FLAG_LABELS[flag]}
                      </span>
                    ))}
                    {lead.audit_flags.length > 3 && (
                      <span className="ld-small self-center">
                        +{lead.audit_flags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="ld-small ld-w">
                  {lead.rating != null
                    ? `${lead.rating} (${lead.review_count ?? 0})`
                    : "—"}
                </td>
                <td>
                  <span
                    className={`ld-pill ${PIPELINE_STATUS_CLASSES[lead.pipeline_status]}`}
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
