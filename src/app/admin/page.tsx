import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "./_components/ui";

const CARDS = [
  { href: "/admin/projects", label: "Projects", table: "projects" as const },
  { href: "/admin/clients", label: "Clients", table: "clients" as const },
  { href: "/admin/capabilities", label: "What We Build", table: "capabilities" as const },
  { href: "/admin/marquees", label: "Marquee items", table: "stack_tokens" as const },
  { href: "/admin/awards", label: "Awards", table: "awards" as const },
  { href: "/admin/approach", label: "Approach steps", table: "approach_steps" as const },
  { href: "/admin/about", label: "About blocks", table: "about_blocks" as const },
];

export default async function AdminDashboard() {
  const supabase = await createClient();

  const counts = await Promise.all(
    CARDS.map(async (c) => {
      const { count } = await supabase
        .from(c.table)
        .select("*", { count: "exact", head: true });
      return { ...c, count: count ?? 0 };
    })
  );

  const tile =
    "group flex flex-col justify-between rounded-[var(--radius-ctl)] border border-[var(--line)] bg-[var(--card)] p-6 transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--sand)]";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Manage every editable surface of the Kagu site. Changes go live after saving."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map((c) => (
          <Link key={c.href} href={c.href} className={`${tile} min-h-32`}>
            <span className="eyebrow">{c.label}</span>
            <p className="display mt-4 text-4xl text-[var(--ink)]">{c.count}</p>
          </Link>
        ))}
        <Link href="/admin/settings" className={`${tile} min-h-32`}>
          <span className="eyebrow">Site settings</span>
          <p className="mt-4 text-sm text-[var(--muted)] transition-colors group-hover:text-[var(--ink)]">
            Founded · location · clocks →
          </p>
        </Link>
      </div>
    </div>
  );
}
