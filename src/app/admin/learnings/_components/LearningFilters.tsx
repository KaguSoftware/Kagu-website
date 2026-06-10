"use client";

/*
  Filter bar for the learnings index. State lives in the URL searchParams so
  views are shareable and the back button works (same pattern as LeadFilters).
*/

import { useRouter } from "next/navigation";
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

  const selectClass =
    "border border-neutral bg-paper px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep";

  return (
    <div className="flex flex-wrap items-end gap-4 border border-neutral p-4">
      <label className="flex min-w-56 flex-1 flex-col gap-1.5">
        <span className="eyebrow">Search</span>
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
          className="border border-neutral bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-neutral focus-visible:border-mint-deep"
        />
      </label>
      <label className="flex min-w-36 flex-col gap-1.5">
        <span className="eyebrow">Tag</span>
        <select
          value={params.tag ?? ""}
          onChange={(e) => apply({ tag: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-36 flex-col gap-1.5">
        <span className="eyebrow">Author</span>
        <select
          value={params.author ?? ""}
          onChange={(e) => apply({ author: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">Everyone</option>
          {authors.map((a) => (
            <option key={a.email} value={a.email}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => apply({ q: undefined, tag: undefined, author: undefined })}
        className="ml-auto py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-ink underline-offset-4 hover:text-ink hover:underline"
      >
        Reset
      </button>
    </div>
  );
}
