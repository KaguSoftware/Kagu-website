"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useNewRequestCount } from "./use-new-request-count";

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
  { href: "/admin/requests", label: "Requests", match: ["/admin/inquiries"] },
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

export function SidebarNav({
  newRequests = 0,
  notify = false,
  variant = "list",
}: {
  /** Server-counted status='new' rows across both request tables (no zero-flash). */
  newRequests?: number;
  /** Toast on new requests — enabled for only one of the two mounted navs. */
  notify?: boolean;
  /** "list" = sidebar rows; "pills" = horizontally scrolling mobile pills. */
  variant?: "list" | "pills";
}) {
  const pathname = usePathname();
  const requestCount = useNewRequestCount(newRequests, { notify });
  const ref = useRef<HTMLElement>(null);

  // Pills: keep the active pill in view when the route changes.
  useEffect(() => {
    if (variant !== "pills") return;
    const el = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname, variant]);

  return (
    <nav
      ref={ref}
      aria-label="Admin"
      className={`adm-nav${variant === "pills" ? " adm-nav--pills" : ""}`}
    >
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
            className="adm-nav__item"
          >
            <span>{item.label}</span>
            {item.href === "/admin/requests" && requestCount > 0 ? (
              <span
                aria-label={`${requestCount} new request${requestCount === 1 ? "" : "s"}`}
                className="adm-badge"
              >
                {requestCount}
              </span>
            ) : null}
            <PendingDot />
          </Link>
        );
      })}
    </nav>
  );
}
