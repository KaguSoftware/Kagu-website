import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/ui";

export const metadata = { title: "Tools" };

/* Internal tools launcher — each tool is a big tile. Add new internal tools
   here (and to the `match` list of the Tools item in SidebarNav). */

export default async function ToolsPage() {
  const supabase = await createClient();
  const [leads, learnings, contributors] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("learnings").select("*", { count: "exact", head: true }),
    supabase.from("learnings").select("author_email"),
  ]);
  const contributorCount = new Set(
    (contributors.data ?? []).map((r) => r.author_email),
  ).size;

  const tools = [
    {
      index: "01",
      href: "/admin/leads",
      title: "Leads",
      description:
        "Internal lead generation — request scrapes, browse scored leads, review outreach drafts.",
      stat: `${leads.count ?? 0} leads in the pipeline`,
    },
    {
      index: "02",
      href: "/admin/learnings",
      title: "Learnings",
      description:
        "The team knowledge base — document what you figured out so the next person doesn't have to.",
      stat: `${learnings.count ?? 0} ${learnings.count === 1 ? "entry" : "entries"} · ${contributorCount} ${contributorCount === 1 ? "contributor" : "contributors"}`,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tools"
        description="Internal tooling for the team. Pick a workspace."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group relative flex aspect-square max-h-80 flex-col border border-neutral bg-paper p-6 transition-colors hover:border-mint-deep sm:p-8"
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
                {tool.index}
              </span>
              <span
                aria-hidden
                className="font-mono text-lg text-slate-ink transition-all group-hover:translate-x-1 group-hover:text-mint-deep"
              >
                →
              </span>
            </div>
            <div className="mt-auto">
              <h2 className="text-xl text-ink transition-colors group-hover:text-mint-deep">
                {tool.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-ink">
                {tool.description}
              </p>
              <p className="mt-4 border-t border-neutral pt-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
                {tool.stat}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
