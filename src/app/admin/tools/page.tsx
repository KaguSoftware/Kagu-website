import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/ui";
import { ToolTile, type Tool } from "./_components/ToolTile";

export const metadata = { title: "Tools" };

/* Internal tools launcher. Add new tools here (and to the `match` list of the
   Tools item in SidebarNav). */

function relative(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default async function ToolsPage() {
  const supabase = await createClient();
  const [leads, hotLeads, learnings, latest] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("lead_score", 60),
    supabase.from("learnings").select("author_email"),
    supabase
      .from("learnings")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const contributors = new Set((learnings.data ?? []).map((r) => r.author_email)).size;
  const entryCount = learnings.data?.length ?? 0;

  const tools: Tool[] = [
    {
      href: "/admin/leads",
      eyebrow: "Pipeline",
      title: "Leads",
      description:
        "Scrape Istanbul block by block, score every business, and draft the outreach that wins them.",
      status: "live",
      stats: [
        `${leads.count ?? 0} prospects`,
        `${hotLeads.count ?? 0} hot (60+)`,
      ],
    },
    {
      href: "/admin/learnings",
      eyebrow: "Knowledge base",
      title: "Learnings",
      description:
        "Everything the team figured out the hard way — written down so nobody pays for it twice.",
      stats: [
        `${entryCount} ${entryCount === 1 ? "entry" : "entries"}`,
        `${contributors} ${contributors === 1 ? "contributor" : "contributors"}`,
        ...(latest.data ? [`updated ${relative(latest.data.updated_at)}`] : []),
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tools"
        description="The workshop — internal machinery that never touches the public site."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {tools.map((tool, i) => (
          <ToolTile key={tool.href} tool={tool} index={i} />
        ))}
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-ink/60">
        More tools land here as we build them.
      </p>
    </div>
  );
}
