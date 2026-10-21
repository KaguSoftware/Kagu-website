"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KaguMark } from "@/components/KaguMark";
import { MenuButton, MobileNav } from "./MobileNav";
import { navItems, contactHref } from "./navItems";

/*
  SiteHeader — sticky, translucent cream + blur; hairline appears after the
  page scrolls. Desktop: links + pill CTA. <=760px: 2-line menu button that
  opens the full-screen sheet (MobileNav). The sheet is a SIBLING of <header>
  because backdrop-filter would otherwise become the containing block of its
  position:fixed box. Styles: src/styles/site-header.css.
*/
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on any route change (covers back/forward as well as link taps).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  return (
    <>
      <header
        className={`site-header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}
      >
        <div className="site-wrap site-header__bar">
          <Link href="/" className="site-brand" aria-label="Kagu home" onClick={close}>
            <KaguMark variant="outline" height={17} />
            <span>kagu</span>
          </Link>

          <nav className="site-header__links" aria-label="Main">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link href={contactHref} className="site-btn">
              Contact
            </Link>
          </nav>

          <MenuButton ref={buttonRef} open={open} onToggle={toggle} />
        </div>
      </header>
      <MobileNav open={open} onClose={close} triggerRef={buttonRef} />
    </>
  );
}
