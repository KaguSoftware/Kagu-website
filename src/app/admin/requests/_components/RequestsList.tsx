"use client";

/*
  Unified intake list: contact messages (contact_requests) and package
  requests (project_inquiries) merged newest-first. Each table gets its own
  realtime subscription via useRealtimeRows; filters apply client-side over
  the merged rows so live INSERT/UPDATE patches respect the active filter.
  Filter state lives in the URL so views are shareable.

  contact_requests carries three kinds of row, told apart by its `source`
  column: /contact, the short form on /marketing, and the /start-marketing
  intake. Rows written before that column existed read as null and are shown
  as plain contact messages.
*/

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InquiryStatus, RequestSource, Tables } from "@/lib/supabase/database.types";
import {
  ANIMATION_ID,
  ANIMATION_LABEL,
  NAV_HOVER_ID,
  NAV_HOVER_LABEL,
  formatPrice,
  getComponentGroup,
  getVariant,
  getWebsiteType,
  FEATURES,
  type PreviewZone,
} from "@/components/start-project/catalog";
import { updateRequestStatus, type RequestTable } from "../../_actions/requests";
import { adminToast } from "../../_components/toast";
import { EmptyState, CustomSelect, Tip } from "../../_components/ui";
import { useRealtimeRows } from "../../_components/use-realtime-rows";
import type { RequestsParams } from "../page";

type ContactRow = Tables<"contact_requests">;
type InquiryRow = Tables<"project_inquiries">;
type Unified =
  | { kind: "contact"; row: ContactRow }
  | { kind: "inquiry"; row: InquiryRow };

const REQUEST_STATUSES: InquiryStatus[] = ["new", "contacted", "archived"];

const STATUS_CLASSES: Record<InquiryStatus, string> = {
  new: "!border-[var(--info)] !text-[var(--info-ink)]",
  contacted: "!border-[var(--ok)] !text-[var(--ok-ink)]",
  archived: "!text-[var(--muted)]",
};

const FEATURE_LABELS = new Map(FEATURES.map((f) => [f.id, f.label]));

const SOURCE_LABELS: Record<RequestSource, string> = {
  contact: "Contact",
  marketing: "Marketing",
  "start-marketing": "Intake",
};

/* The value the type filter matches on: a contact row is filtered by which
   form sent it, an inquiry row by being an inquiry. */
function kindKey(item: Unified): string {
  return item.kind === "inquiry" ? "inquiry" : (item.row.source ?? "contact");
}

/* Resolves both feature ids and "zone:variant" component tokens to labels. */
function labelFor(id: string): string {
  if (id === `${ANIMATION_ID}:true`) return ANIMATION_LABEL;
  if (id === `${NAV_HOVER_ID}:true`) return NAV_HOVER_LABEL;
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
    <CustomSelect
      value={value}
      onChange={(v) => change(v as InquiryStatus)}
      options={REQUEST_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
      aria-label="Request status"
      className="w-36 shrink-0"
      buttonClassName={`!min-h-9 !py-1.5 !text-sm ${STATUS_CLASSES[value]}`}
    />
  );
}

function KindChip({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[11px] leading-4 text-[var(--muted)]">
      {label}
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
    <div className="flex w-52 flex-col gap-1.5">
      <span id={`flt-${label}`} className="eyebrow">
        {label}
      </span>
      <CustomSelect
        value={value}
        onChange={onChange}
        aria-labelledby={`flt-${label}`}
        options={[{ value: "", label: allLabel }, ...options]}
      />
    </div>
  );
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <Tip text={live ? "Realtime connected" : "Realtime unavailable — polling"}>
      <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <span
          className={`inline-block size-1.5 rounded-full ${live ? "bg-[var(--ok)]" : "bg-[var(--line-strong)]"}`}
        />
        {live ? "Live" : "Polling"}
      </span>
    </Tip>
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
      (!typeFilter || kindKey(item) === typeFilter) &&
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
      <div className="flex flex-wrap items-end gap-4 border-b border-[var(--line)] pb-5">
        <FilterSelect
          label="Type"
          value={typeFilter}
          onChange={(type) => apply({ type })}
          allLabel="All types"
          options={[
            { value: "contact", label: "Contact messages" },
            { value: "marketing", label: "Marketing enquiries" },
            { value: "start-marketing", label: "Marketing intake" },
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
            ? "No requests yet — they appear here when someone submits the /contact or /marketing forms, fills in the /start-marketing intake, or sends a package from /start-project."
            : "Nothing matches these filters."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-[var(--radius-ctl)] border border-[var(--line)] bg-[var(--card)]">
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
    <li className="space-y-2 px-5 py-4 transition-colors hover:bg-[var(--sand)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KindChip label={SOURCE_LABELS[row.source ?? "contact"]} />
          <div>
            <a
              href={`mailto:${row.email}`}
              className="text-base text-ink transition-colors hover:text-[var(--accent-ink)]"
            >
              {row.name}
            </a>
            <p className="text-[13px] text-[var(--muted)]">
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
      <p className="max-w-2xl whitespace-pre-wrap text-sm text-[var(--ink)]">{row.message}</p>
    </li>
  );
}

function InquiryItem({ row }: { row: InquiryRow }) {
  const type = getWebsiteType(row.website_type);
  const featureLabels = (row.features ?? []).map(labelFor).join(", ");
  const addOns = (row.features ?? []).filter((id) => !id.includes(":")).length;
  return (
    <li className="space-y-2 px-5 py-4 transition-colors hover:bg-[var(--sand)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KindChip label="Inquiry" />
          <div>
            <a
              href={`mailto:${row.email}`}
              className="text-base text-ink transition-colors hover:text-[var(--accent-ink)]"
            >
              {row.name}
            </a>
            <p className="text-[13px] text-[var(--muted)]">
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
      {featureLabels ? <p className="text-xs text-[var(--muted)]">{featureLabels}</p> : null}
      {row.notes ? <p className="max-w-2xl text-sm text-[var(--ink)]">{row.notes}</p> : null}
    </li>
  );
}
