"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  /** Extra path prefixes that should light this item up (e.g. tool pages). */
  match?: string[];
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/capabilities", label: "What We Build" },
  { href: "/admin/marquees", label: "Marquees" },
  { href: "/admin/awards", label: "Awards" },
  { href: "/admin/approach", label: "Approach" },
  { href: "/admin/team", label: "Team" },
  {
    href: "/admin/tools",
    label: "Tools",
    match: ["/admin/leads", "/admin/learnings"],
  },
  { href: "/admin/about", label: "About" },
  { href: "/admin/settings", label: "Settings" },
];

/* A tiny pending dot that appears while THIS link's navigation is in flight
   (useLinkStatus must run inside the Link subtree). Pairs with the top
   RouteProgress bar for immediate, per-item feedback. */
function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="ml-auto inline-block size-1.5 animate-pulse rounded-full bg-mint-deep"
    />
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : [item.href, ...(item.match ?? [])].some((p) =>
              pathname.startsWith(p),
            );
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 border-l-2 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
              active
                ? "border-mint-deep text-ink"
                : "border-transparent text-slate-ink hover:text-ink"
            }`}
          >
            <span>{item.label}</span>
            <PendingDot />
          </Link>
        );
      })}
    </nav>
  );
}
