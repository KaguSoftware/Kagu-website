"use client";

/*
  Filter bar for the learnings index. State lives in the URL searchParams so
  views are shareable and the back button works (same pattern as LeadFilters).
*/

import { useRouter } from "next/navigation";
import { CustomSelect } from "../../_components/ui";
import type { LearningsParams } from "../page";

export function LearningFilters({
  params,
  tags,
  authors,
}: {
  params: LearningsParams;
  tags: string[];
  authors: { email: string; label: string }[];
}) {
  const router = useRouter();

  const apply = (patch: Partial<LearningsParams>) => {
    const next = { ...params, ...patch };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    router.replace(`/admin/learnings${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="lr-filters">
      <label className="kagu-field lr-filters__search">
        <span className="eyebrow mb-2 block">Search</span>
        <input
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Search titles and summaries…"
          onKeyDown={(e) => {
            if (e.key === "Enter")
              apply({ q: e.currentTarget.value.trim() || undefined });
          }}
          onBlur={(e) => {
            const q = e.currentTarget.value.trim() || undefined;
            if ((params.q ?? undefined) !== q) apply({ q });
          }}
          className="w-full"
        />
      </label>
      <div className="kagu-field lr-filters__sel">
        <span id="lr-tag-label" className="eyebrow mb-2 block">
          Tag
        </span>
        <CustomSelect
          aria-labelledby="lr-tag-label"
          value={params.tag ?? ""}
          onChange={(v) => apply({ tag: v || undefined })}
          options={[
            { value: "", label: "All tags" },
            ...tags.map((t) => ({ value: t, label: t })),
          ]}
        />
      </div>
      <div className="kagu-field lr-filters__sel">
        <span id="lr-author-label" className="eyebrow mb-2 block">
          Author
        </span>
        <CustomSelect
          aria-labelledby="lr-author-label"
          value={params.author ?? ""}
          onChange={(v) => apply({ author: v || undefined })}
          options={[
            { value: "", label: "Everyone" },
            ...authors.map((a) => ({ value: a.email, label: a.label })),
          ]}
        />
      </div>
      <button
        type="button"
        onClick={() => apply({ q: undefined, tag: undefined, author: undefined })}
        className="adm-btn adm-btn--text"
      >
        Reset
      </button>
    </div>
  );
}
