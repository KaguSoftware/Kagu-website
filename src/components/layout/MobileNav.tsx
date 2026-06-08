"use client";

/*
  MobileNav — the brand's own full-screen menu, not a generic drawer.

  Motifs borrowed from the rest of the site so the menu reads as "Kagu":
    · AmbientDrift backdrop (same wash as the hero / loading curtain)
    · indexed numerals (01 / Work …) echoing the Approach section
    · the cycling multilingual greeting + "Est. 2025" footer from the hero
    · mono display type, mint-deep underline accent

  Trigger is two short rules that cross into an ✕ on open (no stock hamburger).
  Shown < md only; the desktop inline nav stays as-is. Locks body scroll while
  open, closes on link tap / route change / Esc, traps focus, reduced-motion safe.

  Static styles live in src/styles/mobile-nav.css (imported via globals.css) so
  the panel's position:fixed/background are in the CSSOM before it mounts —
  rendering them from an inline <style> caused a one-frame unstyled flash on open.
*/

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { navItems } from "./navItems";
import { AmbientDrift } from "@/components/motion/AmbientDrift";
import { GreetingCycle } from "@/components/motion/GreetingCycle";

export function MobileNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close whenever the route changes — covers browser back/forward as well as
  // link taps. Mirrors the set-state-in-effect convention used by PreloadCurtain.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while open; restore on close/unmount.
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // Esc to close + focus management (move focus into panel, restore to trigger).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Move focus to the first link once the panel is mounted.
    const first = panelRef.current?.querySelector<HTMLElement>("a[href]");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="kagu-burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`kagu-burger__rule kagu-burger__rule--top ${open ? "is-open" : ""}`} />
        <span className={`kagu-burger__rule kagu-burger__rule--bottom ${open ? "is-open" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            ref={panelRef}
            className="kagu-mobilemenu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduced ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.76, 0, 0.24, 1] }}
          >
            <motion.div
              className="kagu-mobilemenu__drift"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : 0.45 }}
            >
              <AmbientDrift variant="light" />
            </motion.div>

            <nav className="kagu-mobilemenu__nav" aria-label="Primary">
              <ul className="kagu-mobilemenu__list">
                {navItems.map((item, i) => {
                  const isActive =
                    pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href} className="kagu-mobilemenu__item">
                      <motion.span
                        className="kagu-mobilemenu__line"
                        initial={reduced ? false : { y: "110%" }}
                        animate={{ y: "0%" }}
                        transition={{
                          duration: reduced ? 0 : 0.6,
                          ease: [0.16, 1, 0.3, 1],
                          delay: reduced ? 0 : 0.12 + i * 0.07,
                        }}
                      >
                        <Link
                          href={item.href}
                          onClick={close}
                          className={`kagu-mobilemenu__link ${isActive ? "is-active" : ""}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <span className="kagu-mobilemenu__index">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="kagu-mobilemenu__label">{item.label}</span>
                        </Link>
                      </motion.span>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="kagu-mobilemenu__footer">
              <GreetingCycle className="kagu-mobilemenu__greeting" />
              <span className="kagu-mobilemenu__est">Est. 2025 · Istanbul</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
