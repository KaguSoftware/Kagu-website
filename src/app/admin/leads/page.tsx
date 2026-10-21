import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../_components/ui";
import { JobsLive } from "./_components/JobsLive";

export const metadata = { title: "Leads overview" };

export default async function LeadsOverviewPage() {
  const supabase = await createClient();

  const [total, noWebsite, contacted, replied, won, { data: jobs }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .contains("audit_flags", JSON.stringify(["no_website"])),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("pipeline_status", "contacted"),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("pipeline_status", "replied"),
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("pipeline_status", "won"),
      supabase
        .from("scrape_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const stats = [
    { label: "Total leads", value: total.count ?? 0, href: "/admin/leads/list" },
    {
      label: "No website",
      value: noWebsite.count ?? 0,
      href: "/admin/leads/list?flag=no_website",
    },
    {
      label: "Contacted",
      value: contacted.count ?? 0,
      href: "/admin/leads/list?status=contacted",
    },
    {
      label: "Replied",
      value: replied.count ?? 0,
      href: "/admin/leads/list?status=replied",
    },
    { label: "Won", value: won.count ?? 0, href: "/admin/leads/list?status=won" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="ld-stats">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="ld-stat">
            <Eyebrow>{stat.label}</Eyebrow>
            <p className="ld-stat__v">{stat.value.toLocaleString("en-US")}</p>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between pb-4">
          <Eyebrow>Recent jobs</Eyebrow>
          <Link
            href="/admin/leads/jobs"
            className="ld-act"
          >
            All jobs →
          </Link>
        </div>
        <JobsLive initial={jobs ?? []} compact limit={5} />
      </div>
    </div>
  );
}
