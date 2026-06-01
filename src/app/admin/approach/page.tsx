import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteApproachStep } from "../_actions/approach";

export default async function ApproachPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("approach_steps")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Approach"
        description="The numbered 'how we work' steps on the homepage."
        action={
          <ButtonLink href="/admin/approach/new" variant="solid">
            + New step
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No steps yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-neutral border border-neutral">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-baseline gap-3">
                <span className="font-mono text-sm text-neutral">{r.number}</span>
                <div className="min-w-0">
                  <Link
                    href={`/admin/approach/${r.id}/edit`}
                    className="text-base text-ink transition-colors hover:text-mint-deep"
                  >
                    {r.title}
                  </Link>
                  <p className="truncate text-sm text-slate-ink">{r.body}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href={`/admin/approach/${r.id}/edit`}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Edit
                </Link>
                <DeleteButton id={r.id} action={deleteApproachStep} confirm={`Delete "${r.title}"?`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
