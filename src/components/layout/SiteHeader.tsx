"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MobileNav } from "./MobileNav";
import { navItems } from "./navItems";

/*
  SiteHeader — anchored via viewTransitionName: 'site-header' so it does not
  slide during inter-route View Transition morphs (the GSAP curtain handles
  full-page curtain visuals; the header stays put).

  Sticky, paper background, hairline bottom. Two clusters: brand (left) and
  primary nav (right). Inline nav ≥ md; a full-screen MobileNav < md.
  Mono-cased nav labels per INTERACTION_GRAMMAR.
*/

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header
      className="sticky top-0"
      style={{
        viewTransitionName: "site-header",
        background: "color-mix(in oklab, var(--paper) 92%, transparent)",
        borderBottom: "1px solid var(--neutral)",
        zIndex: "var(--z-nav)" as unknown as number,
      }}
    >
      <div className="w-full max-w-(--container-max) mx-auto px-(--container-x) flex items-center justify-between" style={{ minHeight: 64 }}>
        <Link
          href="/"
          aria-label="Kagu, home"
          data-cursor="nav-link"
          style={{ fontSize: "var(--type-lg)" }}
        >
          <Logo wordmarkOnly size={28} />
        </Link>
        <nav className="hidden md:block">
          <ul className="flex items-center gap-8 list-none m-0 p-0">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-cursor="nav-link"
                    className={`kagu-nav-link ${isActive ? "is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--type-xs)",
                      letterSpacing: "var(--tracking-eyebrow)",
                      textTransform: "uppercase",
                      color: "var(--ink)",
                      padding: "8px 0",
                      position: "relative",
                      display: "inline-block",
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <MobileNav />
      </div>
      <style>{`
        .kagu-nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          right: 100%;
          bottom: 4px;
          height: 1px;
          background: var(--mint-deep);
          transition: right 220ms cubic-bezier(0.6, 0.01, 0.05, 0.95);
        }
        .kagu-nav-link:hover::after,
        .kagu-nav-link:focus-visible::after,
        .kagu-nav-link.is-active::after {
          right: 0;
        }
        .kagu-nav-link.is-active {
          color: var(--ink);
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-nav-link::after { transition: none; }
        }
      `}</style>
    </header>
  );
}
