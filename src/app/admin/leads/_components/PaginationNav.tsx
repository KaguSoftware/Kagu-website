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

  return (
    <nav className="ld-pager" aria-label="Pagination">
      {page > 1 ? (
        <Link href={pageHref(params, page - 1)} className="adm-btn adm-btn--ghost ld-sm">
          ← Prev
        </Link>
      ) : (
        <span className="adm-btn adm-btn--ghost ld-sm" aria-disabled="true">← Prev</span>
      )}
      <span className="ld-small ld-num">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={pageHref(params, page + 1)} className="adm-btn adm-btn--ghost ld-sm">
          Next →
        </Link>
      ) : (
        <span className="adm-btn adm-btn--ghost ld-sm" aria-disabled="true">Next →</span>
      )}
    </nav>
  );
}
