"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/capabilities", label: "What We Build" },
  { href: "/admin/marquees", label: "Marquees" },
  { href: "/admin/awards", label: "Awards" },
  { href: "/admin/approach", label: "Approach" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/about", label: "About" },
  { href: "/admin/settings", label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`border-l-2 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
              active
                ? "border-mint-deep text-ink"
                : "border-transparent text-slate-ink hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
