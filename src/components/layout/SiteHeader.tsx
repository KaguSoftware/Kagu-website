"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { MobileNav } from "./MobileNav";
import { navItems } from "./navItems";

/*
  SiteHeader — a floating "Glass Navbar" (after hover.dev), Kagu-toned.

  Desktop (≥ md): a frosted-glass pill detached from the top edge, three clusters
  on a 1fr/auto/1fr grid so the logo stays truly centered — nav links left,
  Kagu wordmark center, a filled mint "Start a project" CTA right.
  Mobile (< md): the pill is hidden; the Corner Nav in MobileNav handles nav.

  Anchored via viewTransitionName: 'site-header' so it does not slide during
  inter-route View Transition morphs. Glass styles live in
  src/styles/site-header.css (imported via globals.css).
*/

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header
      className="fixed top-0 left-0 right-0 flex justify-center"
      style={{
        viewTransitionName: "site-header",
        padding: "clamp(0.6rem, 2vh, 1rem) var(--container-x)",
        zIndex: "var(--z-nav)" as unknown as number,
        pointerEvents: "none", // let the transparent gutter pass clicks through; pill re-enables
      }}
    >
      <div className="kagu-glassnav">
        <nav className="kagu-glassnav__left" aria-label="Primary">
          <ul>
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
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href="/"
          aria-label="Kagu, home"
          data-cursor="nav-link"
          className="kagu-glassnav__logo"
        >
          <Logo wordmarkOnly size={28} />
        </Link>

        <div className="kagu-glassnav__right">
          <Link href="/start-project" data-cursor="nav-link" className="kagu-glassnav__cta">
            <span className="kagu-glassnav__cta-label">Start a project</span>
            <span aria-hidden className="kagu-glassnav__cta-arrow">→</span>
          </Link>
        </div>
      </div>

      <MobileNav />
    </header>
  );
}
