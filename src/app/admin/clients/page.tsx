import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteClientRecord } from "../_actions/clients";
import Link from "next/link";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clients"
        description="Production clients shown in the marquee. Linked to projects; a client can't be deleted while a project still references it."
        action={
          <ButtonLink href="/admin/clients/new" variant="solid">
            + New client
          </ButtonLink>
        }
      />

      {!clients || clients.length === 0 ? (
        <EmptyState>No clients yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-neutral border border-neutral">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <Link
                  href={`/admin/clients/${c.id}/edit`}
                  className="text-base text-ink transition-colors hover:text-mint-deep"
                >
                  {c.name}
                </Link>
                <p className="font-mono text-xs text-slate-ink">
                  {c.slug} · sort {c.sort_order}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/clients/${c.id}/edit`}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-ink"
                >
                  Edit
                </Link>
                <DeleteButton
                  id={c.id}
                  action={deleteClientRecord}
                  confirm={`Delete client "${c.name}"?`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
