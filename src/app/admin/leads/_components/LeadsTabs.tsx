"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/leads", label: "Overview", exact: true },
  { href: "/admin/leads/jobs", label: "Jobs" },
  { href: "/admin/leads/list", label: "Leads" },
  { href: "/admin/leads/messages", label: "Messages" },
  { href: "/admin/leads/seo", label: "SEO" },
];

export function LeadsTabs() {
  const pathname = usePathname();

  return (
    <nav className="ld-tabs" aria-label="Leads sections">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="ld-tab"
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
