import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteAboutBlock } from "../_actions/about";

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("about_blocks")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="About"
        description="Editable blocks for the About page: mission, paragraphs, principles, and metrics."
        action={
          <ButtonLink href="/admin/about/new" variant="solid">
            + New block
          </ButtonLink>
        }
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>No about blocks yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-neutral border border-neutral">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <span className="eyebrow">{r.kind}</span>
                <p className="truncate text-base text-ink">
                  {r.title || r.body || r.value || "—"}
                </p>
                {r.kind === "metric" && r.value ? (
                  <p className="font-mono text-xs text-slate-ink">{r.value}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href={`/admin/about/${r.id}/edit`}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Edit
                </Link>
                <DeleteButton id={r.id} action={deleteAboutBlock} confirm="Delete this block?" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
