"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/leads", label: "Overview", exact: true },
  { href: "/admin/leads/jobs", label: "Jobs" },
  { href: "/admin/leads/list", label: "Leads" },
  { href: "/admin/leads/messages", label: "Messages" },
  { href: "/admin/leads/seo", label: "SEO" },
  { href: "/admin/leads/audit", label: "Site audit" },
];

export function LeadsTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-wrap gap-1 border-b border-neutral">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
              active
                ? "border-mint-deep text-ink"
                : "border-transparent text-slate-ink hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
