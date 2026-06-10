import Link from "next/link";
import type { LeadsListParams } from "../list/page";

function pageHref(params: LeadsListParams, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, page: undefined })) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return `/admin/leads/list${qs ? `?${qs}` : ""}`;
}

export function PaginationNav({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: LeadsListParams;
}) {
  if (totalPages <= 1) return null;

  const linkClass =
    "border border-neutral px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-ink transition-colors hover:border-mint-deep";
  const disabledClass =
    "border border-neutral px-3 py-1.5 text-xs font-mono uppercase tracking-[0.18em] text-neutral";

  return (
    <nav className="flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? (
        <Link href={pageHref(params, page - 1)} className={linkClass}>
          ← Prev
        </Link>
      ) : (
        <span className={disabledClass}>← Prev</span>
      )}
      <span className="text-xs text-slate-ink">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={pageHref(params, page + 1)} className={linkClass}>
          Next →
        </Link>
      ) : (
        <span className={disabledClass}>Next →</span>
      )}
    </nav>
  );
}
