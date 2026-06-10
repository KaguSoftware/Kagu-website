"use client";

/*
  Filter bar for the leads list. State lives in the URL searchParams so views
  are shareable and the back button works; changing a filter resets the page.
*/

import { useRouter } from "next/navigation";
import type { LeadsListParams } from "../list/page";
import {
  AUDIT_FLAG_LABELS,
  AUDIT_FLAGS,
  ISTANBUL_DISTRICTS,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_LABELS,
} from "../_lib/constants";

const SORT_OPTIONS = [
  { value: "score", label: "Score (high → low)" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name (A → Z)" },
  { value: "rating", label: "Rating (high → low)" },
];

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
  allLabel?: string;
}) {
  return (
    <label className="flex min-w-36 flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-neutral bg-paper px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep"
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LeadFilters({
  params,
  categories,
}: {
  params: LeadsListParams;
  /* Distinct categories from scrape_jobs — the taxonomy leads were scraped under. */
  categories: string[];
}) {
  const router = useRouter();

  const apply = (patch: Partial<LeadsListParams>) => {
    const next = { ...params, ...patch, page: undefined };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    router.replace(`/admin/leads/list${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-end gap-4 border border-neutral p-4">
      <FilterSelect
        label="District"
        value={params.district ?? ""}
        onChange={(district) => apply({ district })}
        allLabel="All districts"
        options={ISTANBUL_DISTRICTS.map((d) => ({ value: d, label: d }))}
      />
      <FilterSelect
        label="Category"
        value={params.category ?? ""}
        onChange={(category) => apply({ category })}
        allLabel="All categories"
        options={categories.map((c) => ({ value: c, label: c }))}
      />
      <FilterSelect
        label="Pipeline"
        value={params.status ?? ""}
        onChange={(status) => apply({ status })}
        allLabel="All statuses"
        options={PIPELINE_STATUSES.map((s) => ({
          value: s,
          label: PIPELINE_STATUS_LABELS[s],
        }))}
      />
      <FilterSelect
        label="Audit flag"
        value={params.flag ?? ""}
        onChange={(flag) => apply({ flag })}
        allLabel="Any flag"
        options={AUDIT_FLAGS.map((f) => ({
          value: f,
          label: AUDIT_FLAG_LABELS[f],
        }))}
      />
      <FilterSelect
        label="Min score"
        value={params.minScore ?? ""}
        onChange={(minScore) => apply({ minScore })}
        allLabel="Any"
        options={["40", "60", "80"].map((v) => ({ value: v, label: `≥ ${v}` }))}
      />
      <FilterSelect
        label="Sort"
        value={params.sort ?? "score"}
        onChange={(sort) => apply({ sort })}
        options={SORT_OPTIONS}
      />
      <button
        type="button"
        onClick={() =>
          apply({
            district: undefined,
            category: undefined,
            status: undefined,
            flag: undefined,
            minScore: undefined,
            sort: undefined,
          })
        }
        className="ml-auto py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink underline-offset-4 hover:text-ink hover:underline"
      >
        Reset
      </button>
    </div>
  );
}
