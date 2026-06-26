"use client";

/*
  Unified intake list: contact messages (contact_requests) and package
  requests (project_inquiries) merged newest-first. Each table gets its own
  realtime subscription via useRealtimeRows; filters apply client-side over
  the merged rows so live INSERT/UPDATE patches respect the active filter.
  Filter state lives in the URL so views are shareable.
*/

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InquiryStatus, Tables } from "@/lib/supabase/database.types";
import {
  ANIMATION_ID,
  ANIMATION_LABEL,
  formatPrice,
  getComponentGroup,
  getVariant,
  getWebsiteType,
  FEATURES,
  type PreviewZone,
} from "@/components/start-project/catalog";
import { updateRequestStatus, type RequestTable } from "../../_actions/requests";
import { adminToast } from "../../_components/toast";
import { EmptyState } from "../../_components/ui";
import { useRealtimeRows } from "../../_components/use-realtime-rows";
import type { RequestsParams } from "../page";

type ContactRow = Tables<"contact_requests">;
type InquiryRow = Tables<"project_inquiries">;
type Unified =
  | { kind: "contact"; row: ContactRow }
  | { kind: "inquiry"; row: InquiryRow };

const REQUEST_STATUSES: InquiryStatus[] = ["new", "contacted", "archived"];

const STATUS_CLASSES: Record<InquiryStatus, string> = {
  new: "border-mint-deep text-mint-deep",
  contacted: "border-[#3fb27f] text-[#3fb27f]",
  archived: "border-neutral text-slate-ink",
};

const FEATURE_LABELS = new Map(FEATURES.map((f) => [f.id, f.label]));

/* Resolves both feature ids and "zone:variant" component tokens to labels. */
function labelFor(id: string): string {
  if (id === `${ANIMATION_ID}:true`) return ANIMATION_LABEL;
  if (id.includes(":")) {
    const [zone, variantId] = id.split(":");
    const variant = getVariant(zone as PreviewZone, variantId);
    if (variant) return `${getComponentGroup(zone as PreviewZone).label}: ${variant.label}`;
  }
  return FEATURE_LABELS.get(id) ?? id;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const byCreatedDesc = <T extends { created_at: string }>(a: T, b: T) =>
  b.created_at.localeCompare(a.created_at);

/* Optimistic status select. Keyed by row id + server status in the parent,
   so a server refresh with a new value remounts it — no sync effect. */
function StatusSelect({
  table,
  id,
  status,
}: {
  table: RequestTable;
  id: string;
  status: InquiryStatus;
}) {
  const [value, setValue] = useState<InquiryStatus>(status);
  const [, startTransition] = useTransition();

  const change = (next: InquiryStatus) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await updateRequestStatus(table, id, next);
      if (!result.ok) {
        setValue(previous);
        adminToast("error", result.error);
      }
    });
  };

  return (
    <select
      value={value}
      onChange={(e) => change(e.target.value as InquiryStatus)}
      className={`border bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] outline-none focus-visible:border-mint-deep ${STATUS_CLASSES[value]}`}
    >
      {REQUEST_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

function KindChip({ kind }: { kind: Unified["kind"] }) {
  return (
    <span className="border border-neutral px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-ink">
      {kind === "contact" ? "Contact" : "Inquiry"}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <label className="flex min-w-36 flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-neutral bg-paper px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink"
      title={live ? "Realtime connected" : "Realtime unavailable — polling"}
    >
      <span
        className={`inline-block size-1.5 rounded-full ${live ? "bg-mint-deep" : "bg-neutral"}`}
      />
      {live ? "Live" : "Polling"}
    </span>
  );
}

export function RequestsList({
  initialContacts,
  initialInquiries,
  params,
}: {
  initialContacts: ContactRow[];
  initialInquiries: InquiryRow[];
  params: RequestsParams;
}) {
  const router = useRouter();

  const { rows: contacts, live: contactsLive } = useRealtimeRows<ContactRow>({
    table: "contact_requests",
    initial: initialContacts,
    sort: byCreatedDesc,
    limit: 300,
  });
  const { rows: inquiries, live: inquiriesLive } = useRealtimeRows<InquiryRow>({
    table: "project_inquiries",
    initial: initialInquiries,
    sort: byCreatedDesc,
    limit: 300,
  });

  const merged: Unified[] = [
    ...contacts.map((row) => ({ kind: "contact", row }) as const),
    ...inquiries.map((row) => ({ kind: "inquiry", row }) as const),
  ].sort((a, b) => byCreatedDesc(a.row, b.row));

  const typeFilter = params.type ?? "";
  const statusFilter = params.status ?? "";
  const visible = merged.filter(
    (item) =>
      (!typeFilter || item.kind === typeFilter) &&
      (!statusFilter || item.row.status === statusFilter)
  );

  const apply = (patch: Partial<RequestsParams>) => {
    const next = { ...params, ...patch };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    router.replace(`/admin/requests${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 border border-neutral p-4">
        <FilterSelect
          label="Type"
          value={typeFilter}
          onChange={(type) => apply({ type })}
          allLabel="All types"
          options={[
            { value: "contact", label: "Contact messages" },
            { value: "inquiry", label: "Project inquiries" },
          ]}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(status) => apply({ status })}
          allLabel="All statuses"
          options={REQUEST_STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <div className="ml-auto pb-2">
          <LiveDot live={contactsLive && inquiriesLive} />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState>
          {merged.length === 0
            ? "No requests yet — they appear here when someone submits the /contact form or sends a package from /start-project."
            : "Nothing matches these filters."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-neutral border border-neutral">
          {visible.map((item) =>
            item.kind === "contact" ? (
              <ContactItem key={`c-${item.row.id}`} row={item.row} />
            ) : (
              <InquiryItem key={`i-${item.row.id}`} row={item.row} />
            )
          )}
        </ul>
      )}
    </div>
  );
}

function ContactItem({ row }: { row: ContactRow }) {
  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KindChip kind="contact" />
          <div>
            <a
              href={`mailto:${row.email}`}
              className="text-base text-ink transition-colors hover:text-mint-deep"
            >
              {row.name}
            </a>
            <p className="font-mono text-xs text-slate-ink">
              {[row.email, row.company, formatDate(row.created_at)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <StatusSelect
          key={`${row.id}-${row.status}`}
          table="contact_requests"
          id={row.id}
          status={row.status}
        />
      </div>
      <p className="max-w-2xl whitespace-pre-wrap text-sm text-ink/80">{row.message}</p>
    </li>
  );
}

function InquiryItem({ row }: { row: InquiryRow }) {
  const type = getWebsiteType(row.website_type);
  const featureLabels = (row.features ?? []).map(labelFor).join(", ");
  const addOns = (row.features ?? []).filter((id) => !id.includes(":")).length;
  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KindChip kind="inquiry" />
          <div>
            <a
              href={`mailto:${row.email}`}
              className="text-base text-ink transition-colors hover:text-mint-deep"
            >
              {row.name}
            </a>
            <p className="font-mono text-xs text-slate-ink">
              {[
                type?.label ?? row.website_type,
                formatPrice(row.total_price),
                `${addOns} add-on${addOns === 1 ? "" : "s"}`,
                row.company,
                formatDate(row.created_at),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <StatusSelect
          key={`${row.id}-${row.status}`}
          table="project_inquiries"
          id={row.id}
          status={row.status}
        />
      </div>
      {featureLabels ? <p className="text-xs text-slate-ink">{featureLabels}</p> : null}
      {row.notes ? <p className="max-w-2xl text-sm text-ink/80">{row.notes}</p> : null}
    </li>
  );
}
