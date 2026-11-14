import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteClientRecord } from "../_actions/clients";
import { RowList, Row } from "../_cms/cms";

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
        <RowList>
          {clients.map((c) => (
            <Row
              key={c.id}
              href={`/admin/clients/${c.id}/edit`}
              title={c.name}
              meta={`${c.slug} · sort ${c.sort_order}`}
              actions={
                <DeleteButton
                  id={c.id}
                  action={deleteClientRecord}
                  confirm={`Delete client "${c.name}"?`}
                />
              }
            />
          ))}
        </RowList>
      )}
    </div>
  );
}
