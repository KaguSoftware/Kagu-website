import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteAward } from "../_actions/awards";

export default async function AwardsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("awards").select("*").order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Awards"
        description="Accolades shown on the homepage. The public section shows the honest 'No awards. Yet.' fallback while this is empty."
        action={
          <ButtonLink href="/admin/awards/new" variant="solid">
            + New award
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No awards yet — the public site shows the honest fallback.</EmptyState>
      ) : (
        <ul className="divide-y divide-neutral border border-neutral">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <Link
                  href={`/admin/awards/${r.id}/edit`}
                  className="text-base text-ink transition-colors hover:text-mint-deep"
                >
                  {r.title}
                </Link>
                <p className="font-mono text-xs text-slate-ink">
                  {[r.year, r.issuer].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/awards/${r.id}/edit`}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Edit
                </Link>
                <DeleteButton id={r.id} action={deleteAward} confirm={`Delete "${r.title}"?`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
