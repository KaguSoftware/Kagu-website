"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type NavLinkItem = { href: string; label: string; exact?: boolean };
type NavEntry = NavLinkItem | { group: string; items: NavLinkItem[] };

const NAV: NavEntry[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/capabilities", label: "What We Build" },
  { href: "/admin/marquees", label: "Marquees" },
  { href: "/admin/awards", label: "Awards" },
  { href: "/admin/approach", label: "Approach" },
  { href: "/admin/team", label: "Team" },
  {
    group: "Tools",
    items: [
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/learnings", label: "Learnings" },
    ],
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

function isActive(pathname: string, item: NavLinkItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLink({
  item,
  pathname,
  indent = false,
}: {
  item: NavLinkItem;
  pathname: string;
  indent?: boolean;
}) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 border-l-2 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
        indent ? "pl-7 pr-4" : "px-4"
      } ${
        active
          ? "border-mint-deep text-ink"
          : "border-transparent text-slate-ink hover:text-ink"
      }`}
    >
      <span>{item.label}</span>
      <PendingDot />
    </Link>
  );
}

function NavGroup({
  group,
  items,
  pathname,
}: {
  group: string;
  items: NavLinkItem[];
  pathname: string;
}) {
  const childActive = items.some((item) => isActive(pathname, item));
  // Follows the route (open while a child is active) until the user toggles,
  // after which their choice wins.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? childActive;

  return (
    <div>
      <button
        type="button"
        onClick={() => setToggled(!open)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2 border-l-2 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] transition-colors ${
          childActive
            ? "border-mint-deep text-ink"
            : "border-transparent text-slate-ink hover:text-ink"
        }`}
      >
        <span>{group}</span>
        <span
          aria-hidden
          className={`ml-auto text-[0.625rem] transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>
      {open ? (
        <div className="flex flex-col">
          {items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} indent />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((entry) =>
        "group" in entry ? (
          <NavGroup
            key={entry.group}
            group={entry.group}
            items={entry.items}
            pathname={pathname}
          />
        ) : (
          <NavLink key={entry.href} item={entry} pathname={pathname} />
        ),
      )}
    </nav>
  );
}
