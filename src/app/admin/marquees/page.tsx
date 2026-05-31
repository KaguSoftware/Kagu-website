import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, ButtonLink, EmptyState } from "../_components/ui";
import { DeleteButton } from "../_components/DeleteButton";
import { deleteStackToken } from "../_actions/stack-tokens";
import type { Tables } from "@/lib/supabase/database.types";

function Group({
  title,
  items,
}: {
  title: string;
  items: Tables<"stack_tokens">[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="eyebrow">{title}</h2>
      {items.length === 0 ? (
        <EmptyState>No items in this marquee.</EmptyState>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="group flex items-center gap-3 border border-neutral px-3 py-2"
            >
              <Link
                href={`/admin/marquees/${t.id}/edit`}
                className="text-sm text-ink transition-colors hover:text-mint-deep"
              >
                {t.label}
              </Link>
              <DeleteButton id={t.id} action={deleteStackToken} confirm={`Delete "${t.label}"?`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function MarqueesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("stack_tokens")
    .select("*")
    .order("sort_order");

  const hero = (rows ?? []).filter((r) => r.placement === "hero_marquee");
  const lineage = (rows ?? []).filter((r) => r.placement === "stack_lineage");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Marquees"
        description="Scrolling text for the hero marquee and the stack-lineage strip."
        action={
          <ButtonLink href="/admin/marquees/new" variant="solid">
            + New item
          </ButtonLink>
        }
      />
      <Group title="Hero marquee" items={hero} />
      <Group title="Stack lineage" items={lineage} />
    </div>
  );
}
